// 本文件实现实验代理 Job、Pod、Service 与 Pod 端口反代。

package kube

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

const (
	agentCPU    = "100m"
	agentMemory = "256Mi"
	homePath    = "/data/hpc/home"
	sharePath   = "/share"
)

// ApplyAgentJob 创建或替换读盘 Job。
func (c *liveClient) ApplyAgentJob(ctx context.Context, spec AgentSpec) error {
	if err := validateAgentSpec(spec); err != nil {
		return err
	}
	backoff := int32(0)
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      spec.Name,
			Namespace: spec.Namespace,
			Labels:    agentLabels(spec),
		},
		Spec: batchv1.JobSpec{
			BackoffLimit: &backoff,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: agentLabels(spec)},
				Spec:       agentPodSpec(spec, corev1.RestartPolicyNever),
			},
		},
	}
	_, err := c.typed.BatchV1().Jobs(spec.Namespace).Create(ctx, job, metav1.CreateOptions{})
	if apierrors.IsAlreadyExists(err) {
		if delErr := c.DeleteAgentJob(ctx, spec.Namespace, spec.Name); delErr != nil {
			return delErr
		}
		_, err = c.typed.BatchV1().Jobs(spec.Namespace).Create(ctx, job, metav1.CreateOptions{})
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "create agent job failed"))
	}
	return nil
}

// ApplyAgentPod 创建或替换看板 Pod。
func (c *liveClient) ApplyAgentPod(ctx context.Context, spec AgentSpec) error {
	if err := validateAgentSpec(spec); err != nil {
		return err
	}
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      spec.Name,
			Namespace: spec.Namespace,
			Labels:    agentLabels(spec),
		},
		Spec: agentPodSpec(spec, corev1.RestartPolicyAlways),
	}
	_, err := c.typed.CoreV1().Pods(spec.Namespace).Create(ctx, pod, metav1.CreateOptions{})
	if apierrors.IsAlreadyExists(err) {
		if delErr := c.DeleteAgentPod(ctx, spec.Namespace, spec.Name); delErr != nil {
			return delErr
		}
		_, err = c.typed.CoreV1().Pods(spec.Namespace).Create(ctx, pod, metav1.CreateOptions{})
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "create agent pod failed"))
	}
	return nil
}

// ApplyAgentService 创建或更新看板 Service。
func (c *liveClient) ApplyAgentService(ctx context.Context, namespace, name string, labels map[string]string, port int32) error {
	if namespace == "" || name == "" {
		return bizerr.New(CodeUnreachable, bizerr.P(msgParam, "service namespace and name are required"))
	}
	if port <= 0 {
		port = consts.ExperimentAgentPort
	}
	desired := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels:    cloneLabels(labels),
		},
		Spec: corev1.ServiceSpec{
			Selector: cloneLabels(labels),
			Ports: []corev1.ServicePort{{
				Name:       "http",
				Port:       port,
				TargetPort: intstr.FromInt32(port),
			}},
		},
	}
	existing, err := c.typed.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		if _, createErr := c.typed.CoreV1().Services(namespace).Create(ctx, desired, metav1.CreateOptions{}); createErr != nil {
			return bizerr.Wrap(createErr, CodeUnreachable, bizerr.P(msgParam, "create agent service failed"))
		}
		return nil
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "get agent service failed"))
	}
	existing.Labels = desired.Labels
	existing.Spec.Selector = desired.Spec.Selector
	existing.Spec.Ports = desired.Spec.Ports
	if _, err := c.typed.CoreV1().Services(namespace).Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "update agent service failed"))
	}
	return nil
}

// ListAgentJobs 按标签列出 Job。
func (c *liveClient) ListAgentJobs(ctx context.Context, namespace, selector string) ([]AgentWorkload, error) {
	list, err := c.typed.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "list agent jobs failed"))
	}
	out := make([]AgentWorkload, 0, len(list.Items))
	for i := range list.Items {
		job := &list.Items[i]
		phase := "Active"
		switch {
		case job.Status.Succeeded > 0:
			phase = "Succeeded"
		case job.Status.Failed > 0:
			phase = "Failed"
		}
		out = append(out, AgentWorkload{
			Name:   job.Name,
			Phase:  phase,
			Labels: cloneLabels(job.Labels),
		})
	}
	return out, nil
}

// ListAgentPods 按标签列出 Pod。
func (c *liveClient) ListAgentPods(ctx context.Context, namespace, selector string) ([]AgentWorkload, error) {
	list, err := c.typed.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{LabelSelector: selector})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "list agent pods failed"))
	}
	out := make([]AgentWorkload, 0, len(list.Items))
	for i := range list.Items {
		pod := &list.Items[i]
		ready := false
		for _, cond := range pod.Status.Conditions {
			if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
				ready = true
				break
			}
		}
		out = append(out, AgentWorkload{
			Name:   pod.Name,
			Phase:  string(pod.Status.Phase),
			Ready:  ready,
			Node:   pod.Spec.NodeName,
			Labels: cloneLabels(pod.Labels),
		})
	}
	return out, nil
}

// DeleteAgentJob 删除 Job 及其 Pod。
func (c *liveClient) DeleteAgentJob(ctx context.Context, namespace, name string) error {
	prop := metav1.DeletePropagationBackground
	err := c.typed.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{PropagationPolicy: &prop})
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "delete agent job failed"))
	}
	return nil
}

// DeleteAgentPod 删除 Pod。
func (c *liveClient) DeleteAgentPod(ctx context.Context, namespace, name string) error {
	err := c.typed.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "delete agent pod failed"))
	}
	return nil
}

// DeleteAgentService 删除 Service。
func (c *liveClient) DeleteAgentService(ctx context.Context, namespace, name string) error {
	err := c.typed.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "delete agent service failed"))
	}
	return nil
}

// ProxyPod 经 API Server 反代容器端口。
func (c *liveClient) ProxyPod(ctx context.Context, in PodProxyInput) (*PodProxyResult, error) {
	if in.Namespace == "" || in.Pod == "" {
		return nil, bizerr.New(CodeUnreachable, bizerr.P(msgParam, "pod proxy namespace and name are required"))
	}
	port := in.Port
	if port <= 0 {
		port = consts.ExperimentAgentPort
	}
	method := strings.ToUpper(strings.TrimSpace(in.Method))
	if method == "" {
		method = http.MethodGet
	}
	path := strings.TrimPrefix(in.Path, "/")
	req := c.typed.CoreV1().RESTClient().Verb(method).
		Namespace(in.Namespace).
		Resource("pods").
		Name(fmt.Sprintf("%s:%d", in.Pod, port)).
		SubResource("proxy")
	if path != "" {
		req = req.Suffix(path)
	}
	if in.RawQuery != "" {
		for _, pair := range strings.Split(in.RawQuery, "&") {
			if pair == "" {
				continue
			}
			k, v, ok := strings.Cut(pair, "=")
			if !ok {
				req = req.Param(k, "")
				continue
			}
			req = req.Param(k, v)
		}
	}
	for k, v := range in.Header {
		req.SetHeader(k, v)
	}
	if len(in.Body) > 0 {
		req.Body(in.Body)
	}
	result := req.Do(ctx)
	status := 0
	result.StatusCode(&status)
	raw, err := result.Raw()
	if apierrors.IsNotFound(err) {
		return nil, bizerr.New(CodePodNotFound)
	}
	if status <= 0 {
		status = http.StatusOK
	}
	if err != nil && raw == nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "proxy pod failed"))
	}
	return &PodProxyResult{Status: status, Header: map[string]string{}, Body: raw}, nil
}

func validateAgentSpec(spec AgentSpec) error {
	if spec.Namespace == "" || spec.Name == "" || spec.Image == "" {
		return bizerr.New(CodeUnreachable, bizerr.P(msgParam, "agent namespace, name and image are required"))
	}
	return nil
}

func agentLabels(spec AgentSpec) map[string]string {
	return map[string]string{
		consts.LabelKeyManaged:   "true",
		consts.LabelKeyAgent:     consts.AgentLabelValue,
		consts.LabelKeyAgentRole: spec.Role,
		consts.LabelKeyRunID:     fmt.Sprintf("%d", spec.RunID),
	}
}

func agentPodSpec(spec AgentSpec, restart corev1.RestartPolicy) corev1.PodSpec {
	env := make([]corev1.EnvVar, 0, len(spec.Env))
	for k, v := range spec.Env {
		env = append(env, corev1.EnvVar{Name: k, Value: v})
	}
	selector := map[string]string{}
	if spec.Datacenter != "" {
		selector[consts.LabelKeyDatacenter] = spec.Datacenter
	}
	hostType := corev1.HostPathDirectoryOrCreate
	return corev1.PodSpec{
		RestartPolicy: restart,
		NodeSelector:  selector,
		Containers: []corev1.Container{{
			Name:    "agent",
			Image:   spec.Image,
			Command: spec.Command,
			Args:    spec.Args,
			Env:     env,
			Ports: []corev1.ContainerPort{{
				Name:          "http",
				ContainerPort: consts.ExperimentAgentPort,
			}},
			Resources: corev1.ResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse(agentCPU),
					corev1.ResourceMemory: resource.MustParse(agentMemory),
				},
				Limits: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse(agentCPU),
					corev1.ResourceMemory: resource.MustParse(agentMemory),
				},
			},
			VolumeMounts: []corev1.VolumeMount{
				{Name: "home", MountPath: homePath},
				{Name: "share", MountPath: sharePath},
			},
		}},
		Volumes: []corev1.Volume{
			{
				Name: "home",
				VolumeSource: corev1.VolumeSource{
					HostPath: &corev1.HostPathVolumeSource{Path: homePath, Type: &hostType},
				},
			},
			{
				Name: "share",
				VolumeSource: corev1.VolumeSource{
					HostPath: &corev1.HostPathVolumeSource{Path: sharePath, Type: &hostType},
				},
			},
		},
	}
}

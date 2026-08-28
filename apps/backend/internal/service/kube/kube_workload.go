// 本文件实现训练任务所需的命名空间、ConfigMap、AbortJob、Pod 列表与容器日志。

package kube

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"
	busv1alpha1 "volcano.sh/apis/pkg/apis/bus/v1alpha1"
	"volcano.sh/apis/pkg/apis/helpers"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

const (
	defaultLogTail = int64(500)
	maxLogTail     = int64(2000)
	msgParam       = "message"
)

// EnsureNamespace 创建命名空间；已存在视为成功。
func (c *liveClient) EnsureNamespace(ctx context.Context, name string) error {
	ns := strings.TrimSpace(name)
	if ns == "" {
		return bizerr.New(CodeUnreachable, bizerr.P(msgParam, "namespace is required"))
	}
	_, err := c.typed.CoreV1().Namespaces().Get(ctx, ns, metav1.GetOptions{})
	if err == nil {
		return nil
	}
	if !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "get namespace failed"))
	}
	_, err = c.typed.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: ns},
	}, metav1.CreateOptions{})
	if err != nil && !apierrors.IsAlreadyExists(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "create namespace failed"))
	}
	return nil
}

// ApplyConfigMap 创建或更新 ConfigMap。owners 非空时写入 controller ownerReferences。
func (c *liveClient) ApplyConfigMap(ctx context.Context, namespace, name string, data map[string]string, owners []OwnerRef) error {
	if namespace == "" || name == "" {
		return bizerr.New(CodeUnreachable, bizerr.P(msgParam, "configmap namespace and name are required"))
	}
	if data == nil {
		data = map[string]string{}
	}
	refs, err := metaOwners(owners)
	if err != nil {
		return err
	}
	desired := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:            name,
			Namespace:       namespace,
			Labels:          map[string]string{consts.LabelKeyManaged: "true"},
			OwnerReferences: refs,
		},
		Data: data,
	}
	existing, err := c.typed.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		if _, createErr := c.typed.CoreV1().ConfigMaps(namespace).Create(ctx, desired, metav1.CreateOptions{}); createErr != nil {
			return bizerr.Wrap(createErr, CodeUnreachable, bizerr.P(msgParam, "create configmap failed"))
		}
		return nil
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "get configmap failed"))
	}
	existing.Data = data
	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	existing.Labels[consts.LabelKeyManaged] = "true"
	if len(refs) > 0 {
		existing.OwnerReferences = refs
	}
	if _, err := c.typed.CoreV1().ConfigMaps(namespace).Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "update configmap failed"))
	}
	return nil
}

func metaOwners(owners []OwnerRef) ([]metav1.OwnerReference, error) {
	if len(owners) == 0 {
		return nil, nil
	}
	ctrl := true
	block := true
	out := make([]metav1.OwnerReference, 0, len(owners))
	for _, owner := range owners {
		if strings.TrimSpace(owner.Name) == "" || strings.TrimSpace(owner.UID) == "" || strings.TrimSpace(owner.Kind) == "" {
			return nil, bizerr.New(CodeUnreachable, bizerr.P(msgParam, "configmap owner reference is incomplete"))
		}
		out = append(out, metav1.OwnerReference{
			APIVersion:         owner.APIVersion,
			Kind:               owner.Kind,
			Name:               owner.Name,
			UID:                types.UID(owner.UID),
			Controller:         &ctrl,
			BlockOwnerDeletion: &block,
		})
	}
	return out, nil
}

// DeleteConfigMap 删除 ConfigMap；不存在视为成功。
func (c *liveClient) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	err := c.typed.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "delete configmap failed"))
	}
	return nil
}

// AbortJob 通过 Volcano Command 中止 Job；已中止或不存在视为成功。
func (c *liveClient) AbortJob(ctx context.Context, namespace, name string) error {
	job, err := c.volcano.BatchV1alpha1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "get volcano job failed"))
	}
	phase := job.Status.State.Phase
	switch phase {
	case batchv1alpha1.Aborted, batchv1alpha1.Terminated, batchv1alpha1.Completed, batchv1alpha1.Failed,
		batchv1alpha1.Aborting, batchv1alpha1.Terminating:
		return nil
	}
	ctrlRef := metav1.NewControllerRef(job, helpers.JobKind)
	cmd := &busv1alpha1.Command{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Command",
			APIVersion: busv1alpha1.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			GenerateName:    fmt.Sprintf("%s-abortjob-", name),
			Namespace:       namespace,
			OwnerReferences: []metav1.OwnerReference{*ctrlRef},
		},
		TargetObject: ctrlRef,
		Action:       string(busv1alpha1.AbortJobAction),
	}
	if _, err := c.volcano.BusV1alpha1().Commands(namespace).Create(ctx, cmd, metav1.CreateOptions{}); err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "abort volcano job failed"))
	}
	return nil
}

// ListJobPods 按 volcano.sh/job-name 列出 Pod。
func (c *liveClient) ListJobPods(ctx context.Context, namespace, jobName string) ([]PodSnapshot, error) {
	list, err := c.typed.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: batchv1alpha1.JobNameKey + "=" + jobName,
	})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "list job pods failed"))
	}
	out := make([]PodSnapshot, 0, len(list.Items))
	for i := range list.Items {
		out = append(out, projectPod(&list.Items[i]))
	}
	return out, nil
}

// GetPodLogs 返回训练容器最近日志。
func (c *liveClient) GetPodLogs(ctx context.Context, namespace, podName string, tailLines int64) (string, error) {
	tail := tailLines
	if tail <= 0 {
		tail = defaultLogTail
	}
	if tail > maxLogTail {
		tail = maxLogTail
	}
	req := c.typed.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{
		Container: consts.TrainingContainerName,
		TailLines: &tail,
	})
	stream, err := req.Stream(ctx)
	if apierrors.IsNotFound(err) {
		return "", bizerr.New(CodePodNotFound)
	}
	if err != nil {
		fallback := c.typed.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{TailLines: &tail})
		stream, err = fallback.Stream(ctx)
		if apierrors.IsNotFound(err) {
			return "", bizerr.New(CodePodNotFound)
		}
		if err != nil {
			return "", bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "get pod logs failed"))
		}
	}
	defer func() { _ = stream.Close() }()
	raw, err := io.ReadAll(stream)
	if err != nil {
		return "", bizerr.Wrap(err, CodeUnreachable, bizerr.P(msgParam, "read pod logs failed"))
	}
	return string(raw), nil
}

func projectPod(pod *corev1.Pod) PodSnapshot {
	task := ""
	if pod.Labels != nil {
		task = pod.Labels[batchv1alpha1.TaskSpecKey]
	}
	index := 0
	if pod.Annotations != nil {
		if raw := strings.TrimSpace(pod.Annotations[batchv1alpha1.TaskIndex]); raw != "" {
			if n, err := strconv.Atoi(raw); err == nil {
				index = n
			}
		}
	}
	if index == 0 && pod.Labels != nil {
		if raw := strings.TrimSpace(pod.Labels[batchv1alpha1.TaskIndex]); raw != "" {
			if n, err := strconv.Atoi(raw); err == nil {
				index = n
			}
		}
	}
	role := "Worker"
	if index == 0 {
		role = "Master"
	}
	var restarts int32
	for _, cs := range pod.Status.ContainerStatuses {
		restarts += cs.RestartCount
	}
	return PodSnapshot{
		Name:     pod.Name,
		Task:     task,
		Index:    index,
		Node:     pod.Spec.NodeName,
		Phase:    string(pod.Status.Phase),
		Restarts: restarts,
		Role:     role,
	}
}

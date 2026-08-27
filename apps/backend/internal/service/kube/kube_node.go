// 本文件实现节点列表与补丁。

package kube

import (
	"context"
	"encoding/json"
	"strings"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

const nodeMutationRetryLimit = 5

// Probe 读取服务端版本。
func (c *liveClient) Probe(ctx context.Context) (*ProbeResult, error) {
	info, err := c.typed.Discovery().ServerVersion()
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "cluster is unreachable"))
	}
	version := strings.TrimSpace(info.GitVersion)
	if version == "" {
		version = strings.TrimSpace(info.String())
	}
	return &ProbeResult{Version: version, APIServer: c.host}, nil
}

// ListNodes 列出节点并按 Pod 请求汇总占用。
func (c *liveClient) ListNodes(ctx context.Context) ([]NodeSnapshot, error) {
	nodeList, err := c.typed.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "list nodes failed"))
	}
	podList, err := c.typed.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		FieldSelector: "status.phase!=Succeeded,status.phase!=Failed",
	})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "list pods failed"))
	}
	usage := aggregatePodUsage(podList.Items)
	out := make([]NodeSnapshot, 0, len(nodeList.Items))
	for i := range nodeList.Items {
		out = append(out, projectNode(&nodeList.Items[i], usage[nodeList.Items[i].Name]))
	}
	return out, nil
}

// PatchNode 使用 resourceVersion 前提的 Merge Patch 更新节点，冲突时有限重试。
// 对齐 ACS gatewaynode：只提交目标字段，由 API Server 校验 RV。
func (c *liveClient) PatchNode(ctx context.Context, name string, patch NodePatch) error {
	for attempt := 0; attempt < nodeMutationRetryLimit; attempt++ {
		node, err := c.typed.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return bizerr.New(CodeNodeNotFound)
			}
			return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "get node failed"))
		}
		if nodeAlreadyAtTarget(node, patch) {
			return nil
		}
		body, err := buildNodeMergePatch(node.ResourceVersion, patch)
		if err != nil {
			return err
		}
		if body == nil {
			return nil
		}
		_, err = c.typed.CoreV1().Nodes().Patch(ctx, name, types.MergePatchType, body, metav1.PatchOptions{})
		if err == nil {
			return nil
		}
		if apierrors.IsConflict(err) {
			continue
		}
		if apierrors.IsNotFound(err) {
			return bizerr.New(CodeNodeNotFound)
		}
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "patch node failed"))
	}
	return bizerr.New(CodeUnreachable, bizerr.P("message", "node patch conflict retries exhausted"))
}

func buildNodeMergePatch(resourceVersion string, patch NodePatch) ([]byte, error) {
	type meta struct {
		ResourceVersion string             `json:"resourceVersion"`
		Labels          map[string]*string `json:"labels,omitempty"`
	}
	type spec struct {
		Taints        *[]corev1.Taint `json:"taints,omitempty"`
		Unschedulable *bool           `json:"unschedulable,omitempty"`
	}
	payload := struct {
		Metadata meta `json:"metadata"`
		Spec     spec `json:"spec,omitempty"`
	}{}
	payload.Metadata.ResourceVersion = resourceVersion
	if len(patch.Labels) > 0 {
		payload.Metadata.Labels = make(map[string]*string, len(patch.Labels))
		for key, value := range patch.Labels {
			if strings.TrimSpace(value) == "" {
				payload.Metadata.Labels[key] = nil
				continue
			}
			v := value
			payload.Metadata.Labels[key] = &v
		}
	}
	if patch.Taints != nil {
		taints := toCoreTaints(*patch.Taints)
		if taints == nil {
			taints = []corev1.Taint{}
		}
		payload.Spec.Taints = &taints
	}
	payload.Spec.Unschedulable = patch.Unschedulable
	if payload.Metadata.Labels == nil && patch.Taints == nil && patch.Unschedulable == nil {
		return nil, nil
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

type resourceAcc struct {
	cpuMilli int64
	memBytes int64
	gpu      int64
	pods     int
}

func aggregatePodUsage(pods []corev1.Pod) map[string]resourceAcc {
	out := make(map[string]resourceAcc)
	for i := range pods {
		pod := &pods[i]
		if pod.Spec.NodeName == "" || pod.DeletionTimestamp != nil {
			continue
		}
		if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
			continue
		}
		acc := out[pod.Spec.NodeName]
		acc.pods++
		used := podRequestAcc(pod)
		acc.cpuMilli += used.cpuMilli
		acc.memBytes += used.memBytes
		acc.gpu += used.gpu
		out[pod.Spec.NodeName] = acc
	}
	return out
}

func podRequestAcc(pod *corev1.Pod) resourceAcc {
	var acc resourceAcc
	for _, container := range pod.Spec.Containers {
		acc.cpuMilli += container.Resources.Requests.Cpu().MilliValue()
		acc.memBytes += container.Resources.Requests.Memory().Value()
		if qty, ok := container.Resources.Requests[corev1.ResourceName(consts.GPUResourceName)]; ok {
			acc.gpu += qty.Value()
		}
	}
	for _, container := range pod.Spec.InitContainers {
		cpu := container.Resources.Requests.Cpu().MilliValue()
		mem := container.Resources.Requests.Memory().Value()
		var gpu int64
		if qty, ok := container.Resources.Requests[corev1.ResourceName(consts.GPUResourceName)]; ok {
			gpu = qty.Value()
		}
		if cpu > acc.cpuMilli {
			acc.cpuMilli = cpu
		}
		if mem > acc.memBytes {
			acc.memBytes = mem
		}
		if gpu > acc.gpu {
			acc.gpu = gpu
		}
	}
	return acc
}

func nodeAlreadyAtTarget(node *corev1.Node, patch NodePatch) bool {
	for key, value := range patch.Labels {
		current, ok := node.Labels[key]
		if strings.TrimSpace(value) == "" {
			if ok {
				return false
			}
			continue
		}
		if !ok || current != value {
			return false
		}
	}
	if patch.Taints != nil {
		want := toCoreTaints(*patch.Taints)
		if !taintsEqual(node.Spec.Taints, want) {
			return false
		}
	}
	if patch.Unschedulable != nil && node.Spec.Unschedulable != *patch.Unschedulable {
		return false
	}
	return true
}

func taintsEqual(a, b []corev1.Taint) bool {
	if len(a) != len(b) {
		return false
	}
	type ident struct{ k, e, v string }
	seen := map[ident]int{}
	for _, t := range a {
		seen[ident{t.Key, string(t.Effect), t.Value}]++
	}
	for _, t := range b {
		id := ident{t.Key, string(t.Effect), t.Value}
		if seen[id] == 0 {
			return false
		}
		seen[id]--
	}
	return true
}

func projectNode(node *corev1.Node, used resourceAcc) NodeSnapshot {
	ip := ""
	for _, addr := range node.Status.Addresses {
		if addr.Type == corev1.NodeInternalIP {
			ip = addr.Address
			break
		}
	}
	ready := false
	var abnormal []string
	for _, cond := range node.Status.Conditions {
		if cond.Type == corev1.NodeReady {
			ready = cond.Status == corev1.ConditionTrue
			continue
		}
		if cond.Status == corev1.ConditionTrue && (cond.Type == corev1.NodeDiskPressure || cond.Type == corev1.NodeMemoryPressure || cond.Type == corev1.NodePIDPressure || cond.Type == corev1.NodeNetworkUnavailable) {
			abnormal = append(abnormal, string(cond.Type))
		}
	}
	roles := nodeRoles(node.Labels)
	gpuTotal := resourceValue(node.Status.Allocatable, consts.GPUResourceName)
	return NodeSnapshot{
		Name:          node.Name,
		IP:            ip,
		Roles:         roles,
		Ready:         ready,
		Schedulable:   !node.Spec.Unschedulable,
		Labels:        cloneLabels(node.Labels),
		Taints:        fromCoreTaints(node.Spec.Taints),
		Conditions:    abnormal,
		PodCount:      used.pods,
		PodCapacity:   int(node.Status.Allocatable.Pods().Value()),
		GPUUsed:       used.gpu,
		GPUTotal:      gpuTotal,
		CPUUsedMilli:  used.cpuMilli,
		CPUTotalMilli: node.Status.Allocatable.Cpu().MilliValue(),
		MemUsedBytes:  used.memBytes,
		MemTotalBytes: node.Status.Allocatable.Memory().Value(),
	}
}

func resourceValue(list corev1.ResourceList, name string) int64 {
	qty, ok := list[corev1.ResourceName(name)]
	if !ok {
		return 0
	}
	return qty.Value()
}

func nodeRoles(labels map[string]string) []string {
	var roles []string
	for key := range labels {
		if strings.HasPrefix(key, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(key, "node-role.kubernetes.io/")
			if role != "" {
				roles = append(roles, role)
			}
		}
	}
	if len(roles) == 0 {
		roles = []string{"worker"}
	}
	return roles
}

func cloneLabels(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func fromCoreTaints(in []corev1.Taint) []Taint {
	out := make([]Taint, 0, len(in))
	for _, item := range in {
		out = append(out, Taint{Key: item.Key, Value: item.Value, Effect: string(item.Effect)})
	}
	return out
}

func toCoreTaints(in []Taint) []corev1.Taint {
	out := make([]corev1.Taint, 0, len(in))
	for _, item := range in {
		out = append(out, corev1.Taint{
			Key:    item.Key,
			Value:  item.Value,
			Effect: corev1.TaintEffect(item.Effect),
		})
	}
	return out
}

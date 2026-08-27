// 本文件用 Volcano 类型化客户端实现 Queue CRUD，启停走 Command CR。

package kube

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	busv1alpha1 "volcano.sh/apis/pkg/apis/bus/v1alpha1"
	"volcano.sh/apis/pkg/apis/helpers"
	schedulingv1beta1 "volcano.sh/apis/pkg/apis/scheduling/v1beta1"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

const (
	queueCommandNamespace = "default"
	queueCreateRetries    = 3
)

func boolPtr(v bool) *bool { return &v }

func int64Ptr(v int64) *int64 { return &v }

// ApplyQueue 创建或更新 Queue CR，创建时对 webhook 未同步父队列做有限重试。
func (c *liveClient) ApplyQueue(ctx context.Context, spec QueueSpec) error {
	desired := queueTyped(spec)
	existing, err := c.volcano.SchedulingV1beta1().Queues().Get(ctx, spec.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return c.createQueueWithRetry(ctx, desired)
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "get volcano queue failed"))
	}
	existing.Spec.Weight = desired.Spec.Weight
	existing.Spec.Reclaimable = desired.Spec.Reclaimable
	existing.Spec.Capability = desired.Spec.Capability
	if existing.Spec.Parent == "" {
		existing.Spec.Parent = QueueParentRoot
	}
	if existing.Labels == nil {
		existing.Labels = map[string]string{}
	}
	for key, value := range desired.Labels {
		existing.Labels[key] = value
	}
	if existing.Annotations == nil {
		existing.Annotations = map[string]string{}
	}
	for key, value := range desired.Annotations {
		existing.Annotations[key] = value
	}
	if _, err := c.volcano.SchedulingV1beta1().Queues().Update(ctx, existing, metav1.UpdateOptions{}); err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "update volcano queue failed"))
	}
	return nil
}

func (c *liveClient) createQueueWithRetry(ctx context.Context, queue *schedulingv1beta1.Queue) error {
	var err error
	for i := 0; i <= queueCreateRetries; i++ {
		if i > 0 {
			logger.Infof(ctx, "create volcano queue %s, retry %d", queue.Name, i)
		}
		_, err = c.volcano.SchedulingV1beta1().Queues().Create(ctx, queue, metav1.CreateOptions{})
		if err == nil {
			return nil
		}
		if apierrors.IsNotFound(err) || strings.Contains(err.Error(), "not found") {
			time.Sleep(time.Millisecond * 500 * time.Duration(i+1))
			continue
		}
		break
	}
	return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "create volcano queue failed"))
}

// GetQueue 读取 Queue 状态。
func (c *liveClient) GetQueue(ctx context.Context, name string) (*QueueSnapshot, error) {
	obj, err := c.volcano.SchedulingV1beta1().Queues().Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil, bizerr.New(CodeQueueNotFound)
	}
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "get volcano queue failed"))
	}
	return projectTypedQueue(obj), nil
}

// SetQueueState 通过 Volcano Command 打开或关闭队列，对齐 ACS k8s/queue Open/Close。
func (c *liveClient) SetQueueState(ctx context.Context, name string, open bool) error {
	action := busv1alpha1.CloseQueueAction
	if open {
		action = busv1alpha1.OpenQueueAction
	}
	queue, err := c.volcano.SchedulingV1beta1().Queues().Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return bizerr.New(CodeQueueNotFound)
	}
	if err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "get volcano queue failed"))
	}
	state := queue.Status.State
	if open && state == schedulingv1beta1.QueueStateOpen {
		return nil
	}
	if !open && (state == schedulingv1beta1.QueueStateClosed || state == schedulingv1beta1.QueueStateClosing) {
		return nil
	}
	ctrlRef := metav1.NewControllerRef(queue, helpers.V1beta1QueueKind)
	cmd := &busv1alpha1.Command{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Command",
			APIVersion: busv1alpha1.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			GenerateName:    fmt.Sprintf("%s-%s-", name, strings.ToLower(string(action))),
			OwnerReferences: []metav1.OwnerReference{*ctrlRef},
		},
		TargetObject: ctrlRef,
		Action:       string(action),
	}
	if _, err := c.volcano.BusV1alpha1().Commands(queueCommandNamespace).Create(ctx, cmd, metav1.CreateOptions{}); err != nil {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "update volcano queue state failed"))
	}
	return nil
}

// DeleteQueue 立即删除 Queue；不存在视为成功。禁止删除 Volcano 内置 root/default。
func (c *liveClient) DeleteQueue(ctx context.Context, name string) error {
	if name == QueueParentRoot || name == schedulingv1beta1.DefaultQueue {
		return bizerr.New(CodeUnreachable, bizerr.P("message", "cannot delete builtin volcano queue"))
	}
	err := c.volcano.SchedulingV1beta1().Queues().Delete(ctx, name, metav1.DeleteOptions{
		GracePeriodSeconds: int64Ptr(0),
	})
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "delete volcano queue failed"))
	}
	return nil
}

func queueTyped(spec QueueSpec) *schedulingv1beta1.Queue {
	capability := corev1.ResourceList{
		corev1.ResourceCPU:    resource.MustParse(fmt.Sprintf("%d", spec.CPUQuota)),
		corev1.ResourceMemory: resource.MustParse(fmt.Sprintf("%dGi", spec.MemQuotaGi)),
	}
	if spec.GPUQuota > 0 {
		capability[corev1.ResourceName(consts.GPUResourceName)] = resource.MustParse(fmt.Sprintf("%d", spec.GPUQuota))
	}
	weight := spec.Weight
	if weight < 1 {
		weight = 1
	}
	return &schedulingv1beta1.Queue{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Queue",
			APIVersion: schedulingv1beta1.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: spec.Name,
			Labels: map[string]string{
				LabelQueueManaged: "true",
			},
			Annotations: map[string]string{
				consts.LabelKeyDatacenter: spec.Datacenter,
				consts.LabelKeyGPUType:    spec.GPUType,
				"maip.io/features":        strings.Join(spec.Features, ","),
			},
		},
		Spec: schedulingv1beta1.QueueSpec{
			Parent:      QueueParentRoot,
			Weight:      weight,
			Reclaimable: boolPtr(spec.Reclaimable),
			Capability:  capability,
		},
	}
}

func projectTypedQueue(obj *schedulingv1beta1.Queue) *QueueSnapshot {
	state := string(obj.Status.State)
	if state == "" {
		state = string(schedulingv1beta1.QueueStateOpen)
	}
	allocated := obj.Status.Allocated
	return &QueueSnapshot{
		Name:      obj.Name,
		State:     state,
		CPUUsed:   quantityFromList(allocated, string(corev1.ResourceCPU)),
		MemUsedGi: memGiFromList(allocated),
		GPUUsed:   quantityFromList(allocated, consts.GPUResourceName),
		Pending:   int(obj.Status.Pending),
		Running:   int(obj.Status.Running),
	}
}

func projectQueue(obj *unstructured.Unstructured) *QueueSnapshot {
	state, _, _ := unstructured.NestedString(obj.Object, "status", "state")
	if state == "" {
		state = string(schedulingv1beta1.QueueStateOpen)
	}
	allocated, _, _ := unstructured.NestedStringMap(obj.Object, "status", "allocated")
	running, _, _ := unstructured.NestedInt64(obj.Object, "status", "running")
	pending, _, _ := unstructured.NestedInt64(obj.Object, "status", "pending")
	return &QueueSnapshot{
		Name:      obj.GetName(),
		State:     state,
		CPUUsed:   quantityCores(allocated["cpu"]),
		MemUsedGi: quantityGi(allocated["memory"]),
		GPUUsed:   quantityCores(allocated[consts.GPUResourceName]),
		Pending:   int(pending),
		Running:   int(running),
	}
}

func quantityFromList(list corev1.ResourceList, name string) int {
	if list == nil {
		return 0
	}
	qty, ok := list[corev1.ResourceName(name)]
	if !ok {
		return 0
	}
	if name == string(corev1.ResourceCPU) {
		return int(qty.MilliValue() / 1000)
	}
	return int(qty.Value())
}

func memGiFromList(list corev1.ResourceList) int {
	if list == nil {
		return 0
	}
	qty, ok := list[corev1.ResourceMemory]
	if !ok {
		return 0
	}
	const gi = 1024 * 1024 * 1024
	return int(qty.Value() / gi)
}

func quantityCores(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	qty, err := resource.ParseQuantity(raw)
	if err != nil {
		n, _ := strconv.Atoi(raw)
		return n
	}
	return int(qty.MilliValue() / 1000)
}

func quantityGi(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	qty, err := resource.ParseQuantity(raw)
	if err != nil {
		return 0
	}
	const gi = 1024 * 1024 * 1024
	return int(qty.Value() / gi)
}

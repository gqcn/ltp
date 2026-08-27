// 本文件实现 Volcano Job 的创建、读取、注解补丁与前台级联删除，对齐 ACS k8s/job ISchedulerJob。

package kube

import (
	"context"
	"encoding/json"

	"github.com/gogf/gf/v2/errors/gerror"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"

	"github.com/gqcn/ltp/pkg/bizerr"
)

// CreateJob 创建完整 Volcano Job 并返回投影。
func (c *liveClient) CreateJob(ctx context.Context, job *batchv1alpha1.Job) (*VolcanoJob, error) {
	if job == nil || job.Name == "" || job.Namespace == "" {
		return nil, bizerr.New(CodeUnreachable, bizerr.P("message", "volcano job namespace and name are required"))
	}
	if err := validateVolcanoJobNames(job); err != nil {
		return nil, err
	}
	obj := job.DeepCopy()
	if obj.Kind == "" {
		obj.Kind = "Job"
	}
	if obj.APIVersion == "" {
		obj.APIVersion = batchv1alpha1.SchemeGroupVersion.String()
	}
	created, err := c.volcano.BatchV1alpha1().Jobs(obj.Namespace).Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "create volcano job failed"))
	}
	return projectJob(created), nil
}

// GetJob 读取 Volcano Job。
func (c *liveClient) GetJob(ctx context.Context, namespace, name string) (*VolcanoJob, error) {
	obj, err := c.volcano.BatchV1alpha1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil, bizerr.New(CodeJobNotFound)
	}
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "get volcano job failed"))
	}
	return projectJob(obj), nil
}

// ListJobs 列出命名空间内 Job。
func (c *liveClient) ListJobs(ctx context.Context, namespace string) ([]*VolcanoJob, error) {
	list, err := c.volcano.BatchV1alpha1().Jobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "list volcano jobs failed"))
	}
	out := make([]*VolcanoJob, 0, len(list.Items))
	for i := range list.Items {
		out = append(out, projectJob(&list.Items[i]))
	}
	return out, nil
}

// PatchJobAnnotations 使用 resourceVersion 作为 CAS 前提合并更新 Job 注解。
func (c *liveClient) PatchJobAnnotations(
	ctx context.Context,
	namespace, name, resourceVersion string,
	annotations map[string]string,
) (*VolcanoJob, error) {
	patchBody := struct {
		Metadata struct {
			ResourceVersion string            `json:"resourceVersion"`
			Annotations     map[string]string `json:"annotations"`
		} `json:"metadata"`
	}{}
	patchBody.Metadata.ResourceVersion = resourceVersion
	patchBody.Metadata.Annotations = annotations
	body, err := json.Marshal(patchBody)
	if err != nil {
		return nil, gerror.Wrap(err, "marshal job annotation patch")
	}
	obj, err := c.volcano.BatchV1alpha1().Jobs(namespace).Patch(ctx, name, types.MergePatchType, body, metav1.PatchOptions{})
	if apierrors.IsNotFound(err) {
		return nil, bizerr.New(CodeJobNotFound)
	}
	if err != nil {
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "patch volcano job failed"))
	}
	return projectJob(obj), nil
}

// DeleteJob 以前台级联删除 Job；不存在视为成功。
func (c *liveClient) DeleteJob(ctx context.Context, namespace, name, uid string) error {
	propagation := metav1.DeletePropagationForeground
	opts := metav1.DeleteOptions{PropagationPolicy: &propagation}
	if uid != "" {
		id := types.UID(uid)
		opts.Preconditions = &metav1.Preconditions{UID: &id}
	}
	err := c.volcano.BatchV1alpha1().Jobs(namespace).Delete(ctx, name, opts)
	if err != nil && !apierrors.IsNotFound(err) {
		return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "delete volcano job failed"))
	}
	return nil
}

func projectJob(obj *batchv1alpha1.Job) *VolcanoJob {
	return &VolcanoJob{
		Namespace:       obj.Namespace,
		Name:            obj.Name,
		Queue:           obj.Spec.Queue,
		Phase:           string(obj.Status.State.Phase),
		MinAvailable:    obj.Spec.MinAvailable,
		UID:             string(obj.UID),
		ResourceVersion: obj.ResourceVersion,
		Annotations:     cloneLabels(obj.Annotations),
	}
}

// 本文件提供内存替身集群客户端，供单元测试注入。

package kube

import (
	"context"
	"strconv"
	"strings"
	"sync"

	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"

	"github.com/gqcn/ltp/pkg/bizerr"
)

// Fake 是可注入的 ClusterClient。
type Fake struct {
	mu              sync.Mutex
	Version         string                       // 探测版本
	APIServer       string                       // API Server
	ProbeErr        error                        // 探测错误
	Nodes           []NodeSnapshot               // 节点库存
	Queues          map[string]QueueSnapshot     // Queue 库存
	Jobs            map[string]*VolcanoJob       // Job 库存，key 为 namespace/name
	Namespaces      map[string]bool              // 已确保的命名空间
	ConfigMaps      map[string]map[string]string // ConfigMap 数据，key 为 namespace/name
	ConfigMapOwners map[string][]OwnerRef        // ConfigMap 属主，key 同 ConfigMaps
	Pods            map[string][]PodSnapshot     // Job Pod，key 为 namespace/job
	Logs            map[string]string            // 容器日志，key 为 namespace/pod
	ListNodesCalls  int                          // ListNodes 调用次数
}

var _ ClusterClient = (*Fake)(nil)

// Probe 返回预设版本或错误。
func (f *Fake) Probe(ctx context.Context) (*ProbeResult, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.ProbeErr != nil {
		return nil, f.ProbeErr
	}
	version := f.Version
	if version == "" {
		version = "v1.27.16"
	}
	host := f.APIServer
	if host == "" {
		host = "https://127.0.0.1:6443"
	}
	return &ProbeResult{Version: version, APIServer: host}, nil
}

// ListNodes 返回节点副本。
func (f *Fake) ListNodes(ctx context.Context) ([]NodeSnapshot, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	f.ListNodesCalls++
	out := make([]NodeSnapshot, len(f.Nodes))
	copy(out, f.Nodes)
	for i := range out {
		out[i].Labels = cloneLabels(out[i].Labels)
		if out[i].Taints != nil {
			taints := make([]Taint, len(out[i].Taints))
			copy(taints, out[i].Taints)
			out[i].Taints = taints
		}
	}
	return out, nil
}

// PatchNode 在内存中修改节点。
func (f *Fake) PatchNode(ctx context.Context, name string, patch NodePatch) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := range f.Nodes {
		if f.Nodes[i].Name != name {
			continue
		}
		if f.Nodes[i].Labels == nil {
			f.Nodes[i].Labels = map[string]string{}
		}
		for key, value := range patch.Labels {
			if strings.TrimSpace(value) == "" {
				delete(f.Nodes[i].Labels, key)
				continue
			}
			f.Nodes[i].Labels[key] = value
		}
		if patch.Taints != nil {
			taints := make([]Taint, len(*patch.Taints))
			copy(taints, *patch.Taints)
			f.Nodes[i].Taints = taints
		}
		if patch.Unschedulable != nil {
			f.Nodes[i].Schedulable = !*patch.Unschedulable
		}
		return nil
	}
	return bizerr.New(CodeNodeNotFound)
}

// ApplyQueue 写入内存 Queue。
func (f *Fake) ApplyQueue(ctx context.Context, spec QueueSpec) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Queues == nil {
		f.Queues = map[string]QueueSnapshot{}
	}
	cur := f.Queues[spec.Name]
	cur.Name = spec.Name
	if cur.State == "" {
		cur.State = "Open"
	}
	f.Queues[spec.Name] = cur
	return nil
}

// GetQueue 读取内存 Queue。
func (f *Fake) GetQueue(ctx context.Context, name string) (*QueueSnapshot, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	item, ok := f.Queues[name]
	if !ok {
		return nil, bizerr.New(CodeQueueNotFound)
	}
	cp := item
	return &cp, nil
}

// SetQueueState 更新内存 Queue 状态。
func (f *Fake) SetQueueState(ctx context.Context, name string, open bool) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	item, ok := f.Queues[name]
	if !ok {
		return bizerr.New(CodeQueueNotFound)
	}
	if open {
		item.State = "Open"
	} else {
		item.State = "Closed"
	}
	f.Queues[name] = item
	return nil
}

// DeleteQueue 删除内存 Queue。
func (f *Fake) DeleteQueue(ctx context.Context, name string) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.Queues, name)
	return nil
}

func jobKey(namespace, name string) string {
	return namespace + "/" + name
}

// CreateJob 写入内存 Job。
func (f *Fake) CreateJob(ctx context.Context, job *batchv1alpha1.Job) (*VolcanoJob, error) {
	_ = ctx
	if job == nil || job.Name == "" || job.Namespace == "" {
		return nil, bizerr.New(CodeUnreachable, bizerr.P("message", "volcano job namespace and name are required"))
	}
	if err := validateVolcanoJobNames(job); err != nil {
		return nil, err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Jobs == nil {
		f.Jobs = map[string]*VolcanoJob{}
	}
	key := jobKey(job.Namespace, job.Name)
	if _, exists := f.Jobs[key]; exists {
		return nil, bizerr.New(CodeUnreachable, bizerr.P("message", "volcano job already exists"))
	}
	projected := projectJob(job)
	if projected.UID == "" {
		projected.UID = "fake-" + job.Name
	}
	if projected.ResourceVersion == "" {
		projected.ResourceVersion = "1"
	}
	f.Jobs[key] = projected
	return cloneJob(projected), nil
}

// GetJob 读取内存 Job。
func (f *Fake) GetJob(ctx context.Context, namespace, name string) (*VolcanoJob, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	item, ok := f.Jobs[jobKey(namespace, name)]
	if !ok {
		return nil, bizerr.New(CodeJobNotFound)
	}
	return cloneJob(item), nil
}

// ListJobs 列出内存 Job。
func (f *Fake) ListJobs(ctx context.Context, namespace string) ([]*VolcanoJob, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*VolcanoJob
	for _, job := range f.Jobs {
		if namespace != "" && job.Namespace != namespace {
			continue
		}
		out = append(out, cloneJob(job))
	}
	return out, nil
}

// PatchJobAnnotations 合并更新内存 Job 注解。
func (f *Fake) PatchJobAnnotations(
	ctx context.Context,
	namespace, name, resourceVersion string,
	annotations map[string]string,
) (*VolcanoJob, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	item, ok := f.Jobs[jobKey(namespace, name)]
	if !ok {
		return nil, bizerr.New(CodeJobNotFound)
	}
	if resourceVersion != "" && item.ResourceVersion != resourceVersion {
		return nil, bizerr.New(CodeUnreachable, bizerr.P("message", "job annotation patch conflict"))
	}
	if item.Annotations == nil {
		item.Annotations = map[string]string{}
	}
	for key, value := range annotations {
		item.Annotations[key] = value
	}
	next, err := strconv.Atoi(item.ResourceVersion)
	if err != nil {
		next = 1
	}
	item.ResourceVersion = strconv.Itoa(next + 1)
	return cloneJob(item), nil
}

// DeleteJob 删除内存 Job；uid 非空且不匹配时拒绝。
func (f *Fake) DeleteJob(ctx context.Context, namespace, name, uid string) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	key := jobKey(namespace, name)
	item, ok := f.Jobs[key]
	if !ok {
		return nil
	}
	if uid != "" && item.UID != uid {
		return bizerr.New(CodeUnreachable, bizerr.P("message", "job uid precondition failed"))
	}
	delete(f.Jobs, key)
	return nil
}

func cloneJob(job *VolcanoJob) *VolcanoJob {
	if job == nil {
		return nil
	}
	cp := *job
	cp.Annotations = cloneLabels(job.Annotations)
	return &cp
}

// EnsureNamespace 记录命名空间。
func (f *Fake) EnsureNamespace(ctx context.Context, name string) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Namespaces == nil {
		f.Namespaces = map[string]bool{}
	}
	f.Namespaces[name] = true
	return nil
}

// ApplyConfigMap 写入内存 ConfigMap 与可选属主。
func (f *Fake) ApplyConfigMap(ctx context.Context, namespace, name string, data map[string]string, owners []OwnerRef) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.ConfigMaps == nil {
		f.ConfigMaps = map[string]map[string]string{}
	}
	copied := map[string]string{}
	for key, value := range data {
		copied[key] = value
	}
	key := namespace + "/" + name
	f.ConfigMaps[key] = copied
	if len(owners) > 0 {
		if f.ConfigMapOwners == nil {
			f.ConfigMapOwners = map[string][]OwnerRef{}
		}
		cloned := make([]OwnerRef, len(owners))
		copy(cloned, owners)
		f.ConfigMapOwners[key] = cloned
	}
	return nil
}

// DeleteConfigMap 删除内存 ConfigMap。
func (f *Fake) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	key := namespace + "/" + name
	delete(f.ConfigMaps, key)
	delete(f.ConfigMapOwners, key)
	return nil
}

// AbortJob 将内存 Job 相位设为 Aborted；不存在视为成功。
func (f *Fake) AbortJob(ctx context.Context, namespace, name string) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	item, ok := f.Jobs[jobKey(namespace, name)]
	if !ok {
		return nil
	}
	item.Phase = "Aborted"
	return nil
}

// ListJobPods 返回预设 Pod。
func (f *Fake) ListJobPods(ctx context.Context, namespace, jobName string) ([]PodSnapshot, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	src := f.Pods[namespace+"/"+jobName]
	out := make([]PodSnapshot, len(src))
	copy(out, src)
	return out, nil
}

// GetPodLogs 返回预设日志。
func (f *Fake) GetPodLogs(ctx context.Context, namespace, podName string, tailLines int64) (string, error) {
	_ = ctx
	_ = tailLines
	f.mu.Lock()
	defer f.mu.Unlock()
	if text, ok := f.Logs[namespace+"/"+podName]; ok {
		return text, nil
	}
	return "", bizerr.New(CodePodNotFound)
}

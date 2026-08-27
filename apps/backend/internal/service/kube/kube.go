// Package kube 封装 Kubernetes 与 Volcano 访问，隔离凭证解析与测试替身。
package kube

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"
)

const (
	queueAPIVersion = "scheduling.volcano.sh/v1beta1"
	queueKind       = "Queue"
	queueGroup      = "scheduling.volcano.sh"
	queueVersion    = "v1beta1"
	queueResource   = "queues"
	// LabelQueueManaged 标记平台创建的 Volcano Queue，避免误操作 default/root。
	LabelQueueManaged = "maip.io/queue-managed"
	// QueueParentRoot 是 Volcano 层级队列的根。
	QueueParentRoot = "root"
)

// Status 是集群连通状态。
type Status string

const (
	// StatusHealthy 表示最近一次探测成功。
	StatusHealthy Status = "healthy"
	// StatusOffline 表示最近一次探测失败。
	StatusOffline Status = "offline"
	// StatusUnknown 表示尚未探测。
	StatusUnknown Status = "unknown"
)

// ProbeResult 是版本探测结果。
type ProbeResult struct {
	Version   string // Kubernetes 版本
	APIServer string // API Server 地址
}

// Taint 是节点污点。
type Taint struct {
	Key    string // 键
	Value  string // 值
	Effect string // 效果
}

// NodeSnapshot 是一次 List 得到的节点投影。
type NodeSnapshot struct {
	Name          string            // 节点名
	IP            string            // 内网 IP
	Roles         []string          // 角色
	Ready         bool              // Ready 条件
	Schedulable   bool              // 未 cordon
	Labels        map[string]string // 标签
	Taints        []Taint           // 污点
	Conditions    []string          // 异常 Condition
	PodCount      int               // 当前 Pod 数
	PodCapacity   int               // Pod 容量
	GPUUsed       int64             // 已分配 GPU
	GPUTotal      int64             // 可分配 GPU
	CPUUsedMilli  int64             // 已分配 CPU 毫核
	CPUTotalMilli int64             // 可分配 CPU 毫核
	MemUsedBytes  int64             // 已分配内存
	MemTotalBytes int64             // 可分配内存
}

// QueueSpec 是写入 Volcano Queue 的声明。
type QueueSpec struct {
	Name        string   // 对象名
	Weight      int32    // 权重
	Reclaimable bool     // 是否可回收
	CPUQuota    int      // CPU 核
	MemQuotaGi  int      // 内存 GiB
	GPUQuota    int      // GPU 卡
	Datacenter  string   // 数据中心注解
	GPUType     string   // 卡型号注解
	Features    []string // 功能特性注解
}

// QueueSnapshot 是 Volcano Queue 状态投影。
type QueueSnapshot struct {
	Name      string // 对象名
	State     string // Open / Closed / Unknown
	CPUUsed   int    // 已分配 CPU 核
	MemUsedGi int    // 已分配内存 GiB
	GPUUsed   int    // 已分配 GPU
	Pending   int    // 排队
	Running   int    // 运行
}

// VolcanoJob 是训练任务在 Volcano 上的投影。
type VolcanoJob struct {
	Namespace       string            // 命名空间
	Name            string            // 任务名
	Queue           string            // 所属队列
	Phase           string            // 状态
	MinAvailable    int32             // Gang 最小可用副本
	UID             string            // 对象 UID，删除时作前提
	ResourceVersion string            // 并发版本
	Annotations     map[string]string // 注解副本
}

// NodePatch 描述一次节点变更。
type NodePatch struct {
	Labels        map[string]string // 合并写入；值为空表示删除键
	Taints        *[]Taint          // 非 nil 时完整替换污点
	Unschedulable *bool             // 非 nil 时设置 cordon
}

// ClusterClient 是单个集群的运行时访问面。
type ClusterClient interface {
	// Probe 返回 Kubernetes 版本与 API Server。
	Probe(ctx context.Context) (*ProbeResult, error)
	// ListNodes 一次列出节点并按 Pod 请求汇总资源占用。
	ListNodes(ctx context.Context) ([]NodeSnapshot, error)
	// PatchNode 更新单节点标签、污点或可调度状态。
	PatchNode(ctx context.Context, name string, patch NodePatch) error
	// ApplyQueue 创建或更新 Volcano Queue。
	ApplyQueue(ctx context.Context, spec QueueSpec) error
	// GetQueue 读取 Volcano Queue；不存在时返回 CodeQueueNotFound。
	GetQueue(ctx context.Context, name string) (*QueueSnapshot, error)
	// SetQueueState 将 Queue 状态设为 Open 或 Closed。
	SetQueueState(ctx context.Context, name string, open bool) error
	// DeleteQueue 删除 Volcano Queue；不存在视为成功。
	DeleteQueue(ctx context.Context, name string) error
	// CreateJob 创建完整 Volcano Job（须含 Tasks），对齐 ACS k8s/job ISchedulerJob.Create。
	CreateJob(ctx context.Context, job *batchv1alpha1.Job) (*VolcanoJob, error)
	// GetJob 读取 Volcano Job；不存在时返回 CodeJobNotFound。
	GetJob(ctx context.Context, namespace, name string) (*VolcanoJob, error)
	// ListJobs 列出指定命名空间内 Volcano Job。
	ListJobs(ctx context.Context, namespace string) ([]*VolcanoJob, error)
	// PatchJobAnnotations 以 resourceVersion 为前提合并更新 Job 注解。
	PatchJobAnnotations(ctx context.Context, namespace, name, resourceVersion string, annotations map[string]string) (*VolcanoJob, error)
	// DeleteJob 以前台级联删除 Volcano Job；uid 非空时作为 UID 前提；不存在视为成功。
	DeleteJob(ctx context.Context, namespace, name, uid string) error
}

// Factory 根据 Kubeconfig 构造集群客户端。
type Factory interface {
	// ClientFor 解析凭证并返回可访问该集群的客户端。
	ClientFor(ctx context.Context, kubeconfig []byte) (ClusterClient, error)
}

var _ Factory = (*factory)(nil)

type factory struct{}

// NewFactory 构造生产用 Kubernetes 客户端工厂。
func NewFactory() Factory {
	return factory{}
}

// NewFactoryWith 使用自定义构造函数，供测试注入。
func NewFactoryWith(fn func(context.Context, []byte) (ClusterClient, error)) Factory {
	if fn == nil {
		return factory{}
	}
	return funcFactory(fn)
}

type funcFactory func(context.Context, []byte) (ClusterClient, error)

// ClientFor 转调注入的构造函数。
func (f funcFactory) ClientFor(ctx context.Context, kubeconfig []byte) (ClusterClient, error) {
	if f == nil {
		return nil, gerror.New("kube factory is required")
	}
	return f(ctx, kubeconfig)
}

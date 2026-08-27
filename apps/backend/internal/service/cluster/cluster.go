// Package cluster 管理接入的 Kubernetes 训练集群。
package cluster

import (
	"context"
	"sync"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/kube"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxKubeYAML    = 1 << 20
)

// Status 是集群连通状态。
type Status = kube.Status

const (
	// StatusHealthy 表示最近一次探测成功。
	StatusHealthy = kube.StatusHealthy
	// StatusOffline 表示最近一次探测失败。
	StatusOffline = kube.StatusOffline
	// StatusUnknown 表示尚未探测。
	StatusUnknown = kube.StatusUnknown
)

// ResourceUsage 是一类资源的占用。
type ResourceUsage struct {
	Used  int64  // 已用
	Total int64  // 总量
	Unit  string // gpu / milliCPU / bytes
}

// GPUTypeUsage 按卡型号聚合。
type GPUTypeUsage struct {
	Type  string // 卡型号
	Used  int64  // 已用
	Total int64  // 总量
}

// DatacenterRef 是节点标签聚合出的数据中心。
type DatacenterRef struct {
	Code      string // 标识
	Name      string // 名称
	ShortName string // 简称
	Color     string // 颜色
}

// Item 是集群投影。
type Item struct {
	ID            int64           // 主键
	Name          string          // 稳定标识
	DisplayName   string          // 显示名
	Description   string          // 说明
	APIServer     string          // API Server
	Version       string          // Kubernetes 版本
	Status        Status          // 连通状态
	Datacenters   []DatacenterRef // 关联数据中心
	NodesReady    int             // Ready 节点
	NodesTotal    int             // 节点总数
	GPU           ResourceUsage   // GPU
	CPU           ResourceUsage   // CPU 毫核
	Memory        ResourceUsage   // 内存字节
	GPUByType     []GPUTypeUsage  // 按卡型号
	KubeconfigSet bool            // 是否已保存凭证
	LastSyncAt    int64           // 最近成功连通
	CreatedAt     int64           // 创建时间
	UpdatedAt     int64           // 更新时间
}

// ListInput 是列表查询。
type ListInput struct {
	PageNum  int    // 页码
	PageSize int    // 每页条数
	Keyword  string // 关键词
}

// Summary 是未筛选 KPI。
type Summary struct {
	Total      int   // 接入数
	Healthy    int   // 健康数
	ReadyNodes int   // Ready 合计
	TotalNodes int   // 节点合计
	GPUTotal   int64 // GPU 总量
}

// ListOutput 是分页结果。
type ListOutput struct {
	List    []*Item // 当前页
	Total   int     // 筛选总数
	Summary Summary // KPI
}

// CreateInput 是接入命令。
type CreateInput struct {
	DisplayName string // 显示名
	Description string // 说明
	Kubeconfig  string // 凭证
}

// UpdateInput 是编辑命令。
type UpdateInput struct {
	ID          int64  // 主键
	DisplayName string // 显示名
	Description string // 说明
	Kubeconfig  string // 可选覆盖
}

// NodeUsageSource 供数据中心关联计数使用。
type NodeUsageSource interface {
	// CountNodesByDatacenter 按数据中心标识统计节点数与覆盖集群数。
	CountNodesByDatacenter(ctx context.Context, codes []string) (nodes map[string]int, clusters map[string]int, err error)
}

// Service 定义集群管理操作。
type Service interface {
	// List 返回分页集群，并批量探测用量。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回集群详情。
	Get(ctx context.Context, id int64) (*Item, error)
	// Create 探测成功后接入集群。
	Create(ctx context.Context, in CreateInput) (int64, error)
	// Update 修改展示信息，可选覆盖凭证。
	Update(ctx context.Context, in UpdateInput) error
	// Probe 连通测试并刷新状态。
	Probe(ctx context.Context, id int64) (*Item, error)
	// Delete 软删除集群。
	Delete(ctx context.Context, id int64) error
	// Client 返回该集群的 Kubernetes 客户端。
	Client(ctx context.Context, id int64) (kube.ClusterClient, error)
	// CountNodesByDatacenter 统计各数据中心的节点数与覆盖集群数。
	CountNodesByDatacenter(ctx context.Context, codes []string) (nodes map[string]int, clusters map[string]int, err error)
}

var (
	_ Service         = (*serviceImpl)(nil)
	_ NodeUsageSource = (*serviceImpl)(nil)
)

type serviceImpl struct {
	factory kube.Factory                 // 客户端工厂
	mu      sync.Mutex                   // 保护 client 与巡检缓存
	clients map[int64]kube.ClusterClient // 按集群 ID 缓存的客户端
	inspect map[int64]inspectEntry       // 短 TTL 节点巡检
}

// New 构造集群服务。factory 不得为空。
func New(factory kube.Factory) (Service, error) {
	if factory == nil {
		return nil, gerror.New("kube factory is required")
	}
	return &serviceImpl{
		factory: factory,
		clients: map[int64]kube.ClusterClient{},
		inspect: map[int64]inspectEntry{},
	}, nil
}

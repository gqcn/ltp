// Package queue 管理业务资源队列并同步 Volcano Queue。
package queue

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/team"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxTeamIDs     = 100
	featureIB      = "ib"
	// syncErrQueueMissing 表示集群中没有与业务队列同名的 Volcano Queue。
	syncErrQueueMissing = "找不到对应的 Volcano Queue"
)

// TeamRef 是关联团队投影。
type TeamRef struct {
	ID   int64  // 团队 ID
	Name string // 名称
}

// Item 是队列投影。
type Item struct {
	ID             int64     // 主键
	ClusterID      int64     // 集群
	Name           string    // Volcano 名
	DisplayName    string    // 显示名
	Description    string    // 说明
	DatacenterCode string    // 数据中心
	GPUType        string    // 卡型号
	GPUQuota       int       // GPU 额度
	GPUUsed        int       // GPU 已用
	CPUQuota       int       // CPU 额度
	CPUUsed        int       // CPU 已用
	MemQuotaGi     int       // 内存额度
	MemUsedGi      int       // 内存已用
	Weight         int       // 权重
	Reclaimable    bool      // 可回收
	Features       []string  // 特性
	Enabled        bool      // 是否 Open
	State          string    // Volcano 状态
	Pending        int       // 排队
	Running        int       // 运行
	SyncError      string    // 同步错误
	Teams          []TeamRef // 团队
	CreatedAt      int64     // 创建
	UpdatedAt      int64     // 更新
}

// ListInput 是列表条件。
type ListInput struct {
	ClusterID      int64  // 集群
	PageNum        int    // 页码
	PageSize       int    // 每页
	Keyword        string // 关键词
	DatacenterCode string // 数据中心
	GPUType        string // 卡型号
	Enabled        *bool  // 启停筛选，nil 表示全部
}

// ListOutput 是分页结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 总数
}

// WriteInput 是创建或更新命令。
type WriteInput struct {
	ClusterID      int64    // 集群
	Name           string   // 标识
	DisplayName    string   // 显示名
	DatacenterCode string   // 数据中心
	GPUType        string   // 卡型号
	GPUQuota       int      // GPU
	CPUQuota       int      // CPU
	MemQuotaGi     int      // 内存
	TeamIDs        []int64  // 团队
	Features       []string // 特性
	Weight         int      // 权重
	Reclaimable    *bool    // 可回收
	Description    string   // 说明
}

// GPUTypeCapacity 是预览中的一种卡型号。
type GPUTypeCapacity struct {
	Type      string // 型号
	Total     int64  // 物理卡
	Allocated int    // 已分配额度
	HasIB     bool   // IB
}

// CapacityPreview 是额度预览。
type CapacityPreview struct {
	GPUTypes     []GPUTypeCapacity // 卡型号
	CPUTotal     int64             // CPU 核
	CPUAllocated int               // CPU 已分配
	MemTotalGi   int64             // 内存 GiB
	MemAllocated int               // 内存已分配
}

// Service 定义队列管理操作。
type Service interface {
	// List 返回分页队列并刷新 Volcano 已用。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回队列详情。
	Get(ctx context.Context, id int64) (*Item, error)
	// Create 写入业务行并创建 Volcano Queue。
	Create(ctx context.Context, in WriteInput) (int64, error)
	// Update 更新元数据并同步 CR。
	Update(ctx context.Context, id int64, in WriteInput) error
	// Resync 按库中元数据创建或更新 Volcano Queue，用于 CR 丢失后修复。成功返回 nil。
	Resync(ctx context.Context, id int64) error
	// UpdateStatus 启用或禁用（Open/Closed）。
	UpdateStatus(ctx context.Context, id int64, enabled bool) error
	// Delete 在空闲时删除 CR 与业务行。
	Delete(ctx context.Context, id int64) error
	// CapacityPreview 返回数据中心容量与已分配额度。
	CapacityPreview(ctx context.Context, clusterID int64, datacenterCode string, features []string, excludeID int64) (*CapacityPreview, error)
	// CountQueuesByDatacenter 按数据中心统计队列数。
	CountQueuesByDatacenter(ctx context.Context, codes []string) (map[string]int, error)
	// ListByTeamIDs 按团队批量返回关联队列。
	ListByTeamIDs(ctx context.Context, teamIDs []int64) (map[int64][]team.QueueRef, error)
	// ListInCluster 列出指定集群队列。allTeams 为真时返回该集群全部队列；否则仅返回关联 teamIDs 的队列。
	ListInCluster(ctx context.Context, clusterID int64, teamIDs []int64, allTeams bool) ([]*Item, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	clusterSvc cluster.Service    // 集群
	dcSvc      datacenter.Service // 数据中心
	teamSvc    team.Service       // 团队
}

// New 构造队列服务。
func New(clusterSvc cluster.Service, dcSvc datacenter.Service, teamSvc team.Service) (Service, error) {
	if clusterSvc == nil {
		return nil, gerror.New("cluster service is required")
	}
	if dcSvc == nil {
		return nil, gerror.New("datacenter service is required")
	}
	if teamSvc == nil {
		return nil, gerror.New("team service is required")
	}
	return &serviceImpl{clusterSvc: clusterSvc, dcSvc: dcSvc, teamSvc: teamSvc}, nil
}

func normalizeDNS1123(name string) (string, error) {
	out, msg := kube.NormalizeQueueName(name)
	if msg != "" {
		return "", errInvalid(msg)
	}
	return out, nil
}

func normalizeFeatures(in []string) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, raw := range in {
		v := strings.ToLower(strings.TrimSpace(raw))
		if v == "" {
			continue
		}
		if v != featureIB {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	if out == nil {
		return []string{}
	}
	return out
}

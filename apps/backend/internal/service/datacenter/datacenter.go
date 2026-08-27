// Package datacenter 实现数据中心登记与增删改查。节点未配置时保持未分配，不回落默认中心。
package datacenter

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
)

const (
	defaultColor   = "#3b82f6"
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
)

// UsageStats 是单个数据中心的关联计数投影。
type UsageStats struct {
	Nodes    int // 节点数
	Queues   int // 队列数
	Clusters int // 集群数
}

// UsageCounter 按批加载数据中心标识的关联计数。
// 实现不得按标识循环查询。
type UsageCounter interface {
	// CountByCodes 按数据中心标识返回关联计数。调用方将缺失键视为零值。
	CountByCodes(ctx context.Context, codes []string) (map[string]UsageStats, error)
}

// Item 是服务层数据中心投影。
type Item struct {
	ID          int64      // 主键
	Code        string     // 数据中心标识
	Name        string     // 显示名称
	ShortName   string     // 简称
	Region      string     // 地域
	LabelKey    string     // 标签键
	Label       string     // 标签文案
	Color       string     // 展示色
	Description string     // 描述
	Enabled     bool       // 历史启停字段，新建恒为 true
	IsDefault   bool       // 是否默认中心
	Usage       UsageStats // 关联计数
	CreatedAt   int64      // 创建时间戳
	UpdatedAt   int64      // 更新时间戳
}

// ListInput 是列表查询条件。
type ListInput struct {
	PageNum  int    // 页码，从 1 开始
	PageSize int    // 每页条数
	Keyword  string // 名称或标识关键词
}

// Summary 是页面 KPI 使用的未筛选库存快照。
type Summary struct {
	Total    int // 总数
	Enabled  int // 启用数
	Disabled int // 停用数
}

// ListOutput 是分页列表结果。
type ListOutput struct {
	List    []*Item // 当前页
	Total   int     // 筛选后总数
	Summary Summary // 未筛选库存快照
}

// CreateInput 是创建命令。
type CreateInput struct {
	Code        string // 数据中心标识
	Name        string // 显示名称
	ShortName   string // 简称
	Region      string // 地域
	Color       string // 展示色
	Description string // 描述
}

// UpdateInput 是元数据更新命令。
type UpdateInput struct {
	ID          int64  // 主键
	Name        string // 显示名称
	ShortName   string // 简称
	Region      string // 地域
	Color       string // 展示色
	Description string // 描述
}

// Service 定义数据中心管理操作。
type Service interface {
	// List 返回经过筛选、排序和分页的数据中心列表。筛选、排序与分页在装配当前页之前于数据库侧完成。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 按 ID 返回数据中心；不存在时返回 CodeNotFound。
	Get(ctx context.Context, id int64) (*Item, error)
	// GetByCode 按业务标识返回数据中心；不存在时返回 CodeNotFound。
	GetByCode(ctx context.Context, code string) (*Item, error)
	// Create 插入一条启用的数据中心并返回 ID。
	Create(ctx context.Context, in CreateInput) (int64, error)
	// Update 修改展示元数据。标识不可改。
	Update(ctx context.Context, in UpdateInput) error
	// Delete 软删除数据中心。存在节点、队列或集群关联时拒绝。
	Delete(ctx context.Context, id int64) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	usage UsageCounter // 关联计数器
}

// New 构造数据中心服务。usage 不得为空。
func New(usage UsageCounter) (Service, error) {
	if usage == nil {
		return nil, gerror.New("datacenter usage counter is required")
	}
	return &serviceImpl{usage: usage}, nil
}

// NewZeroUsageCounter 为每个标识返回全零关联计数。
func NewZeroUsageCounter() UsageCounter {
	return zeroUsageCounter{}
}

type zeroUsageCounter struct{}

// CountByCodes 为请求的标识返回零值统计映射。
func (zeroUsageCounter) CountByCodes(_ context.Context, codes []string) (map[string]UsageStats, error) {
	out := make(map[string]UsageStats, len(codes))
	for _, code := range codes {
		out[code] = UsageStats{}
	}
	return out, nil
}

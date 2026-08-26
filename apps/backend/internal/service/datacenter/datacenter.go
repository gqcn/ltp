// Package datacenter 实现数据中心登记、增删改查与默认中心保护。
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
	Nodes    int
	Queues   int
	Clusters int
}

// UsageCounter 按批加载数据中心标识的关联计数。
// 实现不得按标识循环查询。
type UsageCounter interface {
	// CountByCodes 按数据中心标识返回关联计数。调用方将缺失键视为零值。
	CountByCodes(ctx context.Context, codes []string) (map[string]UsageStats, error)
}

// Item 是服务层数据中心投影。
type Item struct {
	ID          int64
	Code        string
	Name        string
	ShortName   string
	Region      string
	LabelKey    string
	Label       string
	Color       string
	Description string
	Enabled     bool
	IsDefault   bool
	Usage       UsageStats
	CreatedAt   int64
	UpdatedAt   int64
}

// ListInput 是列表查询条件。
type ListInput struct {
	PageNum  int
	PageSize int
	Keyword  string
	Enabled  *bool
}

// Summary 是页面 KPI 使用的未筛选库存快照。
type Summary struct {
	Total            int
	Enabled          int
	Disabled         int
	DefaultShortName string
}

// ListOutput 是分页列表结果。
type ListOutput struct {
	List    []*Item
	Total   int
	Summary Summary
}

// CreateInput 是创建命令。
type CreateInput struct {
	Code        string
	Name        string
	ShortName   string
	Region      string
	Color       string
	Description string
}

// UpdateInput 是元数据更新命令。
type UpdateInput struct {
	ID          int64
	Name        string
	ShortName   string
	Region      string
	Color       string
	Description string
}

// Service 定义数据中心管理操作。
type Service interface {
	// List 返回经过筛选、排序和分页的数据中心列表。筛选、排序与分页在装配当前页之前于数据库侧完成。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 按 ID 返回数据中心；不存在时返回 CodeNotFound。
	Get(ctx context.Context, id int64) (*Item, error)
	// Create 插入一条启用的非默认数据中心并返回 ID。
	Create(ctx context.Context, in CreateInput) (int64, error)
	// Update 修改展示元数据。标识与默认标记不可改。
	Update(ctx context.Context, in UpdateInput) error
	// UpdateStatus 启用或停用非默认数据中心。
	UpdateStatus(ctx context.Context, id int64, enabled bool) error
	// Delete 软删除非默认数据中心。
	Delete(ctx context.Context, id int64) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	usage UsageCounter
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

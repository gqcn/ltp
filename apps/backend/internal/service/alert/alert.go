// Package alert 接收 FastX Webhook 并提供告警查询与处理。
package alert

import (
	"context"
	"encoding/json"
	"strings"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxBatchIDs    = 100
	sourceFastX    = "FastX"
)

// Severity 是告警级别。
type Severity string

const (
	// SeverityInfo 对应 FastX level 1。
	SeverityInfo Severity = "info"
	// SeverityWarning 对应 FastX level 2。
	SeverityWarning Severity = "warning"
	// SeverityCritical 对应 FastX level >= 3。
	SeverityCritical Severity = "critical"
)

// Status 是处理状态。
type Status string

const (
	// StatusOpen 待处理。
	StatusOpen Status = "open"
	// StatusFollowing 跟进中。
	StatusFollowing Status = "following"
	// StatusHandled 已完成。
	StatusHandled Status = "handled"
)

// Range 是时间范围。
type Range string

const (
	// Range1h 最近 1 小时。
	Range1h Range = "1h"
	// Range6h 最近 6 小时。
	Range6h Range = "6h"
	// Range24h 最近 24 小时。
	Range24h Range = "24h"
	// Range7d 最近 7 天。
	Range7d Range = "7d"
	// Range30d 最近 30 天。
	Range30d Range = "30d"
	// RangeAll 全部。
	RangeAll Range = "all"
)

// Config 是告警服务纯值配置。
type Config struct {
	WebhookToken string // FastX 共享令牌，空表示不校验
}

// Item 是告警列表投影。
type Item struct {
	ID           int64    // 主键
	DisplayID    string   // ALT-n
	ClusterID    int64    // 集群
	Severity     Severity // 级别
	Title        string   // 标题
	AlertInfo    string   // 告警信息
	FaultInfo    string   // 故障信息
	Source       string   // 来源
	NodeNames    string   // 节点
	Status       Status   // 状态
	HandleRemark string   // 备注
	HandledAt    int64    // 处理时间
	HandledBy    string   // 处理人
	FirstAlarmAt int64    // 首次告警
	CreatedAt    int64    // 入库
	AlarmCount   int      // 次数
	AlarmLevel   int      // 原始 level
	CreateUser   string   // FastX 创建人
	Payload      string   // 原始 JSON
}

// ListInput 是列表条件。
type ListInput struct {
	ClusterID int64    // 0 表示全部
	PageNum   int      // 页码
	PageSize  int      // 每页
	Keyword   string   // 关键词
	Severity  Severity // 级别，空=全部
	Status    Status   // 状态，空=全部
	Range     Range    // 时间
}

// Summary 是 KPI。
type Summary struct {
	Total      int // 总数
	Open       int // 待处理
	Following  int // 跟进中
	Handled    int // 已完成
	Critical   int // critical
	Warning    int // warning
	Info       int // info
	Unfinished int // open+following
}

// ListOutput 是分页结果。
type ListOutput struct {
	List    []*Item // 当前页
	Total   int     // 筛选总数
	Summary Summary // KPI
}

// IngestInput 是 Webhook 入库命令。
type IngestInput struct {
	Token   string          // 请求令牌
	Payload json.RawMessage // 原始 JSON
}

// HandleInput 是处理命令。
type HandleInput struct {
	IDs      []int64 // 告警 ID
	Status   Status  // 目标状态
	Remark   string  // 备注
	Operator string  // 处理人
}

// Service 定义告警操作。
type Service interface {
	// Ingest 校验令牌并解析 FastX JSON 入库。
	Ingest(ctx context.Context, in IngestInput) (int64, error)
	// List 筛选分页告警。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回详情含原始 JSON。
	Get(ctx context.Context, id int64) (*Item, error)
	// Handle 批量更新处理状态。
	Handle(ctx context.Context, in HandleInput) error
	// Summary 返回未完成数量。
	Summary(ctx context.Context) (Summary, error)
	// ListByClusterNodes 返回指定集群中 node_names 与给定节点有交集的告警，最多 50 条。
	ListByClusterNodes(ctx context.Context, clusterID int64, nodes []string) ([]*Item, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	token string // 配置令牌
}

// New 构造告警服务。
func New(cfg Config) (Service, error) {
	return &serviceImpl{token: strings.TrimSpace(cfg.WebhookToken)}, nil
}

func displayID(id int64) string {
	return "ALT-" + itoa64(id)
}

func itoa64(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

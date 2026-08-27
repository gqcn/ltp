// Package node 实现工作集群的节点列表、标签污点与隔离入池。
package node

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/kube"
)

const (
	maxBatch       = 100
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
)

// Action 是维护记录动作。
type Action string

const (
	// ActionIsolate 表示整节点隔离。
	ActionIsolate Action = "isolate"
	// ActionRecover 表示入池。
	ActionRecover Action = "recover"
	// ActionSetDC 表示分配数据中心。
	ActionSetDC Action = "set-dc"
	// ActionLabels 表示更新标签。
	ActionLabels Action = "labels"
	// ActionTaints 表示更新污点。
	ActionTaints Action = "taints"
)

// Result 是维护结果。
type Result string

const (
	// ResultSuccess 表示成功。
	ResultSuccess Result = "success"
	// ResultFail 表示失败。
	ResultFail Result = "fail"
)

// StatusFilter 是节点状态筛选。
type StatusFilter string

const (
	// StatusAll 表示不筛选。
	StatusAll StatusFilter = "all"
	// StatusReady 表示 Ready 且可调度。
	StatusReady StatusFilter = "Ready"
	// StatusNotReady 表示 NotReady。
	StatusNotReady StatusFilter = "NotReady"
	// StatusDisabled 表示已 cordon。
	StatusDisabled StatusFilter = "SchedulingDisabled"
)

// Taint 是污点投影。
type Taint = kube.Taint

// Item 是节点列表投影。
type Item struct {
	Name          string            // 节点名
	IP            string            // IP
	Roles         []string          // 角色
	Ready         bool              // Ready
	Schedulable   bool              // 可调度
	Status        string            // 展示状态
	Datacenter    string            // 数据中心标识
	GPUType       string            // 卡型号
	HasIB         bool              // IB
	IBDomain      string            // IB 域
	Isolated      bool              // 故障隔离
	IsolateRemark string            // 最近一次成功隔离备注
	PodCount      int               // Pod 数
	PodCapacity   int               // Pod 容量
	GPUUsed       int64             // GPU 已用
	GPUTotal      int64             // GPU 总量
	CPUUsedMilli  int64             // CPU 已用毫核
	CPUTotalMilli int64             // CPU 总量毫核
	MemUsedBytes  int64             // 内存已用
	MemTotalBytes int64             // 内存总量
	Conditions    []string          // 异常条件
	Labels        map[string]string // 标签
	Taints        []Taint           // 污点
}

// ListInput 是节点列表条件。
type ListInput struct {
	ClusterID  int64        // 工作集群
	PageNum    int          // 页码
	PageSize   int          // 每页
	Keyword    string       // 名称/IP
	Datacenter string       // all / unset / code
	Status     StatusFilter // 状态
	GPUType    string       // 卡型号
}

// Summary 是当前集群 KPI。
type Summary struct {
	Total         int // 总数
	Ready         int // Ready 可调度
	NotReady      int // NotReady
	Unschedulable int // cordon
	UnsetDc       int // 未分配数据中心
}

// ListOutput 是分页节点。
type ListOutput struct {
	List     []*Item  // 当前页
	Total    int      // 筛选总数
	Summary  Summary  // KPI
	GPUTypes []string // 卡型号候选项
}

// Event 是维护记录。
type Event struct {
	ID        int64  // 主键
	ClusterID int64  // 集群
	NodeName  string // 节点
	Action    Action // 动作
	Operator  string // 操作者
	Remark    string // 备注
	Result    Result // 结果
	CreatedAt int64  // 时间
}

// EventListInput 是维护记录查询。
type EventListInput struct {
	ClusterID int64  // 集群
	NodeName  string // 可选节点
	PageNum   int    // 页码
	PageSize  int    // 每页
}

// EventListOutput 是分页记录。
type EventListOutput struct {
	List  []*Event // 当前页
	Total int      // 总数
}

// MutateInput 是批量节点变更。
type MutateInput struct {
	ClusterID int64             // 集群
	Names     []string          // 节点名
	Operator  string            // 操作者
	Remark    string            // 备注
	Code      string            // 数据中心，空表示清除
	Labels    map[string]string // 标签
	Taints    []Taint           // 污点
}

// Service 定义节点运维操作。
type Service interface {
	// List 从工作集群实时列出节点。已隔离节点会附带最近一次成功隔离备注，当前页一次批量查询，零值表示未隔离或无记录。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// AssignDatacenter 设置或清除数据中心标签。
	AssignDatacenter(ctx context.Context, in MutateInput) error
	// UpdateLabels 合并写入标签。
	UpdateLabels(ctx context.Context, in MutateInput) error
	// UpdateTaints 完整替换污点。
	UpdateTaints(ctx context.Context, in MutateInput) error
	// Isolate 整节点隔离。
	Isolate(ctx context.Context, in MutateInput) error
	// Recover 整节点入池。
	Recover(ctx context.Context, in MutateInput) error
	// ListEvents 列出维护记录。
	ListEvents(ctx context.Context, in EventListInput) (*EventListOutput, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	clusterSvc cluster.Service    // 集群服务
	dcSvc      datacenter.Service // 数据中心服务
}

// New 构造节点服务。
func New(clusterSvc cluster.Service, dcSvc datacenter.Service) (Service, error) {
	if clusterSvc == nil {
		return nil, gerror.New("cluster service is required")
	}
	if dcSvc == nil {
		return nil, gerror.New("datacenter service is required")
	}
	return &serviceImpl{clusterSvc: clusterSvc, dcSvc: dcSvc}, nil
}

func normalizeNames(names []string) ([]string, error) {
	out := make([]string, 0, len(names))
	seen := map[string]struct{}{}
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	if len(out) == 0 {
		return nil, errInvalid("请选择节点")
	}
	if len(out) > maxBatch {
		return nil, errInvalid("单次最多操作 100 个节点")
	}
	return out, nil
}

// Package exprun 管理实验 Run、外层快照与机房代理对账。
package exprun

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/expproject"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/trainjob"
)

const (
	maxListSize      = 100
	defaultListNum   = 1
	defaultPageSz    = 10
	maxCompareRuns   = 5
	minCompareRuns   = 2
	idleBoardWindow  = 20 * time.Minute
	metricsFreshFor  = 45 * time.Second
	boardWait        = 45 * time.Second
	agentRoleMetrics = "metrics"
	agentRoleServe   = "serve"
	sortUpdatedDesc  = "updated_desc"
	sortCreatedDesc  = "created_desc"
	sortLossAsc      = "loss_asc"
	sortLossDesc     = "loss_desc"
)

type linkedJobStatus string

const (
	linkedQueued    linkedJobStatus = "queued"
	linkedStarting  linkedJobStatus = "starting"
	linkedRunning   linkedJobStatus = "running"
	linkedSuccess   linkedJobStatus = "success"
	linkedFailed    linkedJobStatus = "failed"
	linkedCancelled linkedJobStatus = "cancelled"
)

// Actor 是当前会话身份。
type Actor struct {
	UserID   int64  // 用户 ID
	Username string // 账号
	Nickname string // 显示名
	IsAdmin  bool   // 是否本地平台管理员
	SeeAll   bool   // 是否可看全部团队数据（管理员或 SRE）
}

// seesAllTeams 表示列表与详情不受团队成员关系限制。
func (a Actor) seesAllTeams() bool {
	return a.IsAdmin || a.SeeAll
}

// Item 是 Run 投影。
type Item struct {
	ID             int64               // 主键
	Name           string              // 名称
	ProjectID      int64               // 项目
	ProjectName    string              // 项目名
	ClusterID      int64               // 集群
	TeamID         int64               // 团队
	TeamName       string              // 团队名
	JobID          int64               // 任务
	JobName        string              // 任务名
	JobStatus      string              // 任务状态
	DatacenterCode string              // 机房
	TbLogdir       string              // logdir
	OwnerUsername  string              // 账号
	OwnerNickname  string              // 显示名
	Loss           *float64            // Loss
	Step           *int64              // step
	MaxSteps       *int64              // 分母
	TokensPerSec   *float64            // 吞吐
	MetricsAt      int64               // 读盘时间
	MetricsError   string              // 读盘错误
	Image          string              // 镜像
	Command        string              // 命令
	Workdir        string              // 工作路径
	Nodes          int                 // 节点
	GpusPerNode    int                 // 每节点 GPU
	GPUCount       int                 // 总 GPU
	Env            []trainjob.EnvEntry // 环境变量
	CreatedAt      int64               // 创建
	UpdatedAt      int64               // 更新
}

// ListInput 是列表条件。
type ListInput struct {
	Actor     Actor  // 调用方
	ClusterID int64  // 集群
	PageNum   int    // 页
	PageSize  int    // 每页
	ProjectID int64  // 项目，0=全部活跃
	Keyword   string // 关键词
	Status    string // 任务状态
	Owner     string // 创建人账号
	Sort      string // 排序
}

// ListOutput 是分页结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 总数
}

// CompareOutput 是对比结果。
type CompareOutput struct {
	Runs         []*Item        // Run
	Fields       []CompareField // Diff
	SameLocation bool           // 同集群同机房
}

// CompareField 是 Diff 行。
type CompareField struct {
	Key    string   // 字段
	Values []string // 取值
	Same   bool     // 是否相同
}

// BoardOpen 是打开看板结果。
type BoardOpen struct {
	ProxyPath string // 反代前缀
	Ready     bool   // 是否就绪
	Message   string // 说明
}

// Config 是实验代理运行配置。
type Config struct {
	AgentImage string        // 镜像
	IdleAfter  time.Duration // 看板空闲回收
}

// Service 定义实验 Run 操作。
type Service interface {
	// EnsureForJob 按任务幂等创建 Run。已存在含已删除的 job_id 时不插入。失败由调用方记录日志，不得回滚任务。
	EnsureForJob(ctx context.Context, in trainjob.JobLink) error
	// List 筛选分页 Run，并为尚无实验行的历史任务补建。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回详情。
	Get(ctx context.Context, actor Actor, id int64) (*Item, error)
	// Compare 对比 2 至 5 条 Run。
	Compare(ctx context.Context, actor Actor, ids []int64) (*CompareOutput, error)
	// Move 把可见 Run 移动到目标项目。
	Move(ctx context.Context, actor Actor, id, projectID int64) error
	// Delete 软删除可见 Run，不删除关联训练任务。
	Delete(ctx context.Context, actor Actor, id int64) error
	// MapByJobIDs 按任务 ID 批量返回快照，缺失的 ID 不出现在结果中。
	MapByJobIDs(ctx context.Context, jobIDs []int64) (map[int64]trainjob.ExperimentRef, error)
	// OpenBoard 记录访问并确保 serve Pod。
	OpenBoard(ctx context.Context, actor Actor, id int64) (*BoardOpen, error)
	// ProxyBoard 将会话请求反代到 serve Pod。
	ProxyBoard(ctx context.Context, actor Actor, id int64, method, path, rawQuery string, header map[string]string, body []byte) (int, []byte, error)
	// Reconcile 对所有健康集群对账实验代理。
	Reconcile(ctx context.Context) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	clusterSvc cluster.Service    // 集群
	teamSvc    team.Service       // 团队
	projectSvc expproject.Service // 项目
	jobSvc     trainjob.Service   // 任务
	cfg        Config             // 代理配置
}

// New 构造实验 Run 服务。
func New(
	clusterSvc cluster.Service,
	teamSvc team.Service,
	projectSvc expproject.Service,
	jobSvc trainjob.Service,
	cfg Config,
) (Service, error) {
	if clusterSvc == nil {
		return nil, gerror.New("cluster service is required")
	}
	if teamSvc == nil {
		return nil, gerror.New("team service is required")
	}
	if projectSvc == nil {
		return nil, gerror.New("project service is required")
	}
	if jobSvc == nil {
		return nil, gerror.New("job service is required")
	}
	if cfg.AgentImage == "" {
		return nil, gerror.New("experiment agent image is required")
	}
	if cfg.IdleAfter <= 0 {
		cfg.IdleAfter = idleBoardWindow
	}
	return &serviceImpl{
		clusterSvc: clusterSvc,
		teamSvc:    teamSvc,
		projectSvc: projectSvc,
		jobSvc:     jobSvc,
		cfg:        cfg,
	}, nil
}

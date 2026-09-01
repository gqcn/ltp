// Package trainjob 管理训练任务，底层创建与中止 Volcano Job。
package trainjob

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/alert"
	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/queue"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/traincfg"
	"github.com/gqcn/ltp/internal/service/user"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxGpusPerNode = 8
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

// EnvEntry 是用户环境变量。
type EnvEntry struct {
	Key   string // 名
	Value string // 值
}

// MountInput 是提交时的配置挂载。
type MountInput struct {
	SetID     int64    // 配置集
	Version   int      // 版本
	MountPath string   // 路径
	Files     []string // 按文件挂载的相对路径，空则整包
}

// MountFile 是挂载快照文件。
type MountFile struct {
	Path    string // 路径
	Content string // 内容
	Size    int    // 字节
}

// Mount 是任务上的配置挂载快照。
type Mount struct {
	SetID       int64       // 配置集
	SetName     string      // 标识
	DisplayName string      // 显示名
	Version     int         // 版本
	MountPath   string      // 路径
	Digest      string      // 摘要
	Files       []MountFile // 文件
}

// Item 是任务投影。
type Item struct {
	ID                  int64      // 主键
	ClusterID           int64      // 集群
	Name                string     // 名称
	Namespace           string     // 命名空间
	Status              string     // 状态
	Priority            string     // 优先级
	TeamID              int64      // 团队
	TeamName            string     // 团队名
	QueueID             int64      // 队列
	QueueName           string     // 队列标识
	QueueDisplayName    string     // 队列显示名
	DatacenterCode      string     // 数据中心标识
	DatacenterName      string     // 数据中心名称
	DatacenterShortName string     // 数据中心简称
	DatacenterColor     string     // 数据中心颜色
	GPUType             string     // 卡型号
	RequireIB           bool       // IB
	Nodes               int        // 节点
	GpusPerNode         int        // 每节点 GPU
	GPUCount            int        // 总 GPU
	CPUPerNode          int        // 每节点 CPU
	MemGiPerNode        int        // 每节点内存
	Image               string     // 镜像
	Command             string     // 命令
	Workdir             string     // 工作路径
	Env                 []EnvEntry // 环境变量
	Mounts              []Mount    // 挂载
	OwnerUsername       string     // 运行账号
	OwnerNickname       string     // 运行显示名
	SubmittedByUsername string     // 提交账号
	SubmittedByNickname string     // 提交显示名
	DurationMs          int64      // 运行毫秒
	GPUHours            float64    // 卡时
	SyncError           string     // 同步错误
	FailReason          string     // 失败原因
	RerunFromID         int64      // 重跑源
	PodNodes            string     // Pod 节点
	ExperimentID        int64      // 关联实验
	ExperimentName      string     // 实验名
	Loss                *float64   // 最新 Loss
	Step                *int64     // 最新 step
	MaxSteps            *int64     // 进度分母
	CreatedAt           int64      // 创建
	StartedAt           int64      // 启动
	EndedAt             int64      // 结束
}

// JobLink 是提交成功后创建实验 Run 所需字段。
type JobLink struct {
	JobID         int64  // 任务 ID
	ClusterID     int64  // 集群
	TeamID        int64  // 团队
	TeamName      string // 团队名
	Name          string // 任务名
	Datacenter    string // 机房
	OwnerUserID   int64  // 运行用户
	OwnerUsername string // 账号
	OwnerNickname string // 显示名
	LogDir        string // TENSORBOARD_LOGDIR
	ProjectID     int64  // 可选实验项目，0 表示默认项目
}

// ExperimentRef 是任务列表装配的实验快照。
type ExperimentRef struct {
	ID       int64    // Run ID
	Name     string   // Run 名
	Loss     *float64 // Loss
	Step     *int64   // step
	MaxSteps *int64   // 分母
}

// RunLinker 由实验模块实现，任务模块可选绑定。
type RunLinker interface {
	// EnsureForJob 按任务幂等创建 Run。
	EnsureForJob(ctx context.Context, in JobLink) error
	// MapByJobIDs 按任务 ID 批量返回实验快照。
	MapByJobIDs(ctx context.Context, jobIDs []int64) (map[int64]ExperimentRef, error)
}

// ListInput 是列表条件。
type ListInput struct {
	Actor     Actor  // 调用方
	ClusterID int64  // 集群
	PageNum   int    // 页码
	PageSize  int    // 每页
	Keyword   string // 关键词
	TeamID    int64  // 团队
	QueueID   int64  // 队列
	Status    string // 状态
	Priority  string // 优先级
	Node      string // 节点
}

// ListOutput 是分页结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 总数
}

// CreateInput 是提交命令。
type CreateInput struct {
	Actor        Actor        // 调用方
	ClusterID    int64        // 集群
	Name         string       // 名称
	Workdir      string       // 工作路径
	Priority     string       // 优先级
	TeamID       int64        // 团队
	QueueID      int64        // 队列
	Nodes        int          // 节点
	GpusPerNode  int          // 每节点 GPU
	CPUPerNode   int          // 每节点 CPU
	MemGiPerNode int          // 每节点内存
	Image        string       // 镜像
	Command      string       // 命令
	Env          []EnvEntry   // 环境变量
	Mounts       []MountInput // 挂载
	RunUserID    int64        // 运行用户
	RerunFromID  int64        // 重跑源
	ProjectID    int64        // 可选实验项目，0 表示默认项目
}

// Pod 是任务 Pod。
type Pod struct {
	Name     string // 名
	Task     string // task
	Index    int    // 序号
	Node     string // 节点
	Phase    string // 相位
	Restarts int32  // 重启
	Role     string // 角色
}

// RelatedAlert 是关联告警。
type RelatedAlert struct {
	ID        int64  // 告警 ID
	DisplayID string // ALT-n
	Severity  string // 级别
	Title     string // 标题
	Status    string // 状态
	NodeNames string // 节点
	CreatedAt int64  // 时间
}

// QueueJob 是我的队列嵌套任务。
type QueueJob struct {
	ID            int64   // 任务
	Name          string  // 名称
	Status        string  // 状态
	Priority      string  // 优先级
	GPUCount      int     // GPU
	GPUType       string  // 型号
	CPUTotal      int     // CPU
	MemGiTotal    int     // 内存
	OwnerNickname string  // 运行用户
	GPUHours      float64 // 卡时
	DurationMs    int64   // 时长
}

// MyQueue 是用户侧队列。
type MyQueue struct {
	ID                  int64          // 队列 ID
	Name                string         // 标识
	DisplayName         string         // 显示名
	DatacenterCode      string         // 数据中心标识
	DatacenterName      string         // 数据中心名称
	DatacenterShortName string         // 数据中心简称
	DatacenterColor     string         // 数据中心颜色
	GPUType             string         // 型号
	GPUQuota            int            // GPU 额度
	GPUUsed             int            // GPU 已用
	CPUQuota            int            // CPU 额度
	CPUUsed             int            // CPU 已用
	MemQuotaGi          int            // 内存额度
	MemUsedGi           int            // 内存已用
	Features            []string       // 特性
	Enabled             bool           // 启用
	State               string         // 状态
	SyncError           string         // 同步错误
	Teams               []team.NameRef // 团队
	GPUHoursMonth       float64        // 本月卡时
	Running             int            // 运行数
	Pending             int            // 排队数
	ActiveJobs          []QueueJob     // 活跃任务
}

// MyQueueSummary 是汇总。
type MyQueueSummary struct {
	GPUQuota        int     // GPU 额度
	GPUUsed         int     // GPU 已用
	CPUQuota        int     // CPU 额度
	CPUUsed         int     // CPU 已用
	MemQuotaGi      int     // 内存额度
	MemUsedGi       int     // 内存已用
	GPUHoursMonth   float64 // 本月卡时
	GPUHoursRunning float64 // 运行中卡时
	Running         int     // 运行
	Pending         int     // 排队
}

// MyQueuesOutput 是我的队列页。
type MyQueuesOutput struct {
	Summary MyQueueSummary // 汇总
	List    []MyQueue      // 列表
}

// RelatedJob 是告警关联任务。
type RelatedJob struct {
	ID     int64  // 任务
	Name   string // 名称
	Status string // 状态
}

// Service 定义训练任务操作。
type Service interface {
	// List 筛选分页任务并刷新 Volcano 相位。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回任务详情。
	Get(ctx context.Context, actor Actor, id int64) (*Item, error)
	// Create 创建业务行与 Volcano Job。
	Create(ctx context.Context, in CreateInput) (int64, error)
	// Cancel 中止排队中、启动中或运行中的任务：对集群执行 AbortJob，再把业务状态写成 cancelled。
	// 集群中 Volcano Job 已不存在时视为已停止。非活跃状态返回 CodeNotRunning；不可见返回 CodeNotFound。
	Cancel(ctx context.Context, actor Actor, id int64) error
	// ListPods 列出 Job Pod。
	ListPods(ctx context.Context, actor Actor, id int64) ([]Pod, error)
	// PodLogs 读取容器日志。
	PodLogs(ctx context.Context, actor Actor, id int64, pod string, tail int64) (string, error)
	// ListAlerts 返回与任务节点相交的告警。
	ListAlerts(ctx context.Context, actor Actor, id int64) ([]RelatedAlert, error)
	// ListMyQueues 返回用户侧队列与卡时。
	ListMyQueues(ctx context.Context, actor Actor, clusterID int64) (*MyQueuesOutput, error)
	// GPUHoursMonthByQueueIDs 按队列批量返回本月卡时。每个 ID 都出现在结果中，无任务为 0；clusterID 或 queueIDs 为空时返回全 0 映射。
	GPUHoursMonthByQueueIDs(ctx context.Context, clusterID int64, queueIDs []int64) (map[int64]float64, error)
	// ListRelatedJobs 按节点名查找任务，供告警中心。
	ListRelatedJobs(ctx context.Context, clusterID int64, nodes []string) ([]RelatedJob, error)
	// MapByIDs 按主键批量返回任务，缺失的 ID 不出现在结果中。
	MapByIDs(ctx context.Context, ids []int64) (map[int64]*Item, error)
	// ListJobLinksByCluster 返回集群内任务的实验关联字段，供补建 Run。零值切片表示无任务。
	ListJobLinksByCluster(ctx context.Context, clusterID int64) ([]JobLink, error)
	// BindRunLinker 注入实验关联，允许为 nil。
	BindRunLinker(linker RunLinker)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	clusterSvc cluster.Service    // 集群
	queueSvc   queue.Service      // 队列
	dcSvc      datacenter.Service // 数据中心
	teamSvc    team.Service       // 团队
	userSvc    user.Service       // 用户
	cfgSvc     traincfg.Service   // 配置
	alertSvc   alert.Service      // 告警
	runLinker  RunLinker          // 可选实验关联
}

// New 构造训练任务服务。
func New(
	clusterSvc cluster.Service,
	queueSvc queue.Service,
	dcSvc datacenter.Service,
	teamSvc team.Service,
	userSvc user.Service,
	cfgSvc traincfg.Service,
	alertSvc alert.Service,
) (Service, error) {
	if clusterSvc == nil {
		return nil, gerror.New("cluster service is required")
	}
	if queueSvc == nil {
		return nil, gerror.New("queue service is required")
	}
	if dcSvc == nil {
		return nil, gerror.New("datacenter service is required")
	}
	if teamSvc == nil {
		return nil, gerror.New("team service is required")
	}
	if userSvc == nil {
		return nil, gerror.New("user service is required")
	}
	if cfgSvc == nil {
		return nil, gerror.New("config service is required")
	}
	if alertSvc == nil {
		return nil, gerror.New("alert service is required")
	}
	return &serviceImpl{
		clusterSvc: clusterSvc,
		queueSvc:   queueSvc,
		dcSvc:      dcSvc,
		teamSvc:    teamSvc,
		userSvc:    userSvc,
		cfgSvc:     cfgSvc,
		alertSvc:   alertSvc,
	}, nil
}

// BindRunLinker 注入实验关联。
func (s *serviceImpl) BindRunLinker(linker RunLinker) {
	s.runLinker = linker
}

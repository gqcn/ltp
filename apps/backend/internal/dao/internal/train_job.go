// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// TrainJobDao is the data access object for the table train_job.
type TrainJobDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  TrainJobColumns    // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// TrainJobColumns defines and stores column names for the table train_job.
type TrainJobColumns struct {
	Id                  string // 任务 ID
	ClusterId           string // 工作集群 ID
	Name                string // Volcano Job 对象名
	Namespace           string // Kubernetes 命名空间，固定 maip
	TeamId              string // 所属团队 ID
	TeamName            string // 提交时团队名称快照
	QueueId             string // 资源队列 ID
	QueueName           string // Volcano Queue 名快照
	QueueDisplayName    string // 队列显示名快照
	DatacenterCode      string // 数据中心标识快照
	GpuType             string // 卡型号快照
	RequireIb           string // 是否使用 IB，取自队列特性
	Priority            string // 优先级：P0 / P1 / P2 / P3
	Status              string // 平台状态：queued / starting / running / success / failed / cancelled
	VolcanoPhase        string // 最近一次 Volcano Job 相位
	VolcanoUid          string // Volcano Job UID
	Nodes               string // 节点数
	GpusPerNode         string // 每节点 GPU 数
	GpuCount            string // 总 GPU 卡数
	CpuPerNode          string // 每节点 CPU 核
	MemGiPerNode        string // 每节点内存 GiB
	Image               string // 容器镜像
	Command             string // 启动命令
	Env                 string // 用户环境变量 JSON 对象
	Workdir             string // 容器工作路径
	OwnerUserId         string // 运行用户 ID
	OwnerUsername       string // 运行用户账号
	OwnerNickname       string // 运行用户显示名
	SubmittedByUserId   string // 提交人 ID
	SubmittedByUsername string // 提交人账号
	SubmittedByNickname string // 提交人显示名
	RerunFromId         string // 重跑源任务 ID
	FailReason          string // 失败原因
	ConfigMounts        string // 配置挂载快照 JSON 数组
	PodNodes            string // 最近一次 Pod 节点名，逗号分隔
	SyncError           string // 与 Volcano 同步失败说明
	StartedAt           string // 开始运行时间
	EndedAt             string // 结束时间
	CreatedAt           string // 创建时间
	UpdatedAt           string // 更新时间
	DeletedAt           string // 删除时间
	ListBucket          string // 列表排序桶：0=排队中，1=其它
	PriorityOrder       string // 优先级排序：P0=0 P1=1 P2=2 P3=3
}

// trainJobColumns holds the columns for the table train_job.
var trainJobColumns = TrainJobColumns{
	Id:                  "id",
	ClusterId:           "cluster_id",
	Name:                "name",
	Namespace:           "namespace",
	TeamId:              "team_id",
	TeamName:            "team_name",
	QueueId:             "queue_id",
	QueueName:           "queue_name",
	QueueDisplayName:    "queue_display_name",
	DatacenterCode:      "datacenter_code",
	GpuType:             "gpu_type",
	RequireIb:           "require_ib",
	Priority:            "priority",
	Status:              "status",
	VolcanoPhase:        "volcano_phase",
	VolcanoUid:          "volcano_uid",
	Nodes:               "nodes",
	GpusPerNode:         "gpus_per_node",
	GpuCount:            "gpu_count",
	CpuPerNode:          "cpu_per_node",
	MemGiPerNode:        "mem_gi_per_node",
	Image:               "image",
	Command:             "command",
	Env:                 "env",
	Workdir:             "workdir",
	OwnerUserId:         "owner_user_id",
	OwnerUsername:       "owner_username",
	OwnerNickname:       "owner_nickname",
	SubmittedByUserId:   "submitted_by_user_id",
	SubmittedByUsername: "submitted_by_username",
	SubmittedByNickname: "submitted_by_nickname",
	RerunFromId:         "rerun_from_id",
	FailReason:          "fail_reason",
	ConfigMounts:        "config_mounts",
	PodNodes:            "pod_nodes",
	SyncError:           "sync_error",
	StartedAt:           "started_at",
	EndedAt:             "ended_at",
	CreatedAt:           "created_at",
	UpdatedAt:           "updated_at",
	DeletedAt:           "deleted_at",
	ListBucket:          "list_bucket",
	PriorityOrder:       "priority_order",
}

// NewTrainJobDao creates and returns a new DAO object for table data access.
func NewTrainJobDao(handlers ...gdb.ModelHandler) *TrainJobDao {
	return &TrainJobDao{
		group:    "default",
		table:    "train_job",
		columns:  trainJobColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *TrainJobDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *TrainJobDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *TrainJobDao) Columns() TrainJobColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *TrainJobDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *TrainJobDao) Ctx(ctx context.Context) *gdb.Model {
	model := dao.DB().Model(dao.table)
	for _, handler := range dao.handlers {
		model = handler(model)
	}
	return model.Safe().Ctx(ctx)
}

// Transaction wraps the transaction logic using function f.
// It rolls back the transaction and returns the error if function f returns a non-nil error.
// It commits the transaction and returns nil if function f returns nil.
//
// Note: Do not commit or roll back the transaction in function f,
// as it is automatically handled by this function.
func (dao *TrainJobDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

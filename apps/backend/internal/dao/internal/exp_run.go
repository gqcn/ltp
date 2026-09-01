// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// ExpRunDao is the data access object for the table exp_run.
type ExpRunDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  ExpRunColumns      // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// ExpRunColumns defines and stores column names for the table exp_run.
type ExpRunColumns struct {
	Id               string // Run ID
	Name             string // Run 名称，默认与任务名相同
	ProjectId        string // 所属项目 ID
	ClusterId        string // 工作集群 ID
	TeamId           string // 所属团队 ID
	TeamName         string // 团队名称快照
	JobId            string // 关联训练任务 ID
	TbLogdir         string // TensorBoard logdir
	DatacenterCode   string // 任务机房标识
	OwnerUserId      string // 创建人 ID
	OwnerUsername    string // 创建人账号
	OwnerNickname    string // 创建人显示名
	LastLoss         string // 最新 train loss
	LastStep         string // 最新 step
	MaxSteps         string // 进度分母，可空
	LastTokensPerSec string // 最新吞吐标量
	MetricsAt        string // 最近一次成功读盘时间
	MetricsError     string // 最近一次读盘失败说明
	BoardAccessedAt  string // 最近一次打开看板时间
	BoardError       string // 看板代理错误说明
	CreatedAt        string // 创建时间
	UpdatedAt        string // 更新时间
	DeletedAt        string // 删除时间
}

// expRunColumns holds the columns for the table exp_run.
var expRunColumns = ExpRunColumns{
	Id:               "id",
	Name:             "name",
	ProjectId:        "project_id",
	ClusterId:        "cluster_id",
	TeamId:           "team_id",
	TeamName:         "team_name",
	JobId:            "job_id",
	TbLogdir:         "tb_logdir",
	DatacenterCode:   "datacenter_code",
	OwnerUserId:      "owner_user_id",
	OwnerUsername:    "owner_username",
	OwnerNickname:    "owner_nickname",
	LastLoss:         "last_loss",
	LastStep:         "last_step",
	MaxSteps:         "max_steps",
	LastTokensPerSec: "last_tokens_per_sec",
	MetricsAt:        "metrics_at",
	MetricsError:     "metrics_error",
	BoardAccessedAt:  "board_accessed_at",
	BoardError:       "board_error",
	CreatedAt:        "created_at",
	UpdatedAt:        "updated_at",
	DeletedAt:        "deleted_at",
}

// NewExpRunDao creates and returns a new DAO object for table data access.
func NewExpRunDao(handlers ...gdb.ModelHandler) *ExpRunDao {
	return &ExpRunDao{
		group:    "default",
		table:    "exp_run",
		columns:  expRunColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *ExpRunDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *ExpRunDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *ExpRunDao) Columns() ExpRunColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *ExpRunDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *ExpRunDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *ExpRunDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

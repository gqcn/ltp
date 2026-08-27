// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsQueueTeamDao is the data access object for the table ops_queue_team.
type OpsQueueTeamDao struct {
	table    string              // table is the underlying table name of the DAO.
	group    string              // group is the database configuration group name of the current DAO.
	columns  OpsQueueTeamColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler  // handlers for customized model modification.
}

// OpsQueueTeamColumns defines and stores column names for the table ops_queue_team.
type OpsQueueTeamColumns struct {
	Id        string // 关联 ID
	QueueId   string // 队列 ID
	TeamId    string // 团队 ID
	CreatedAt string // 创建时间
}

// opsQueueTeamColumns holds the columns for the table ops_queue_team.
var opsQueueTeamColumns = OpsQueueTeamColumns{
	Id:        "id",
	QueueId:   "queue_id",
	TeamId:    "team_id",
	CreatedAt: "created_at",
}

// NewOpsQueueTeamDao creates and returns a new DAO object for table data access.
func NewOpsQueueTeamDao(handlers ...gdb.ModelHandler) *OpsQueueTeamDao {
	return &OpsQueueTeamDao{
		group:    "default",
		table:    "ops_queue_team",
		columns:  opsQueueTeamColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsQueueTeamDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsQueueTeamDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsQueueTeamDao) Columns() OpsQueueTeamColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsQueueTeamDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsQueueTeamDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsQueueTeamDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

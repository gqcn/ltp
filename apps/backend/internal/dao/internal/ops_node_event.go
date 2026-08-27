// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsNodeEventDao is the data access object for the table ops_node_event.
type OpsNodeEventDao struct {
	table    string              // table is the underlying table name of the DAO.
	group    string              // group is the database configuration group name of the current DAO.
	columns  OpsNodeEventColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler  // handlers for customized model modification.
}

// OpsNodeEventColumns defines and stores column names for the table ops_node_event.
type OpsNodeEventColumns struct {
	Id        string // 记录 ID
	ClusterId string // 所属集群 ID
	NodeName  string // Kubernetes 节点名
	Action    string // 动作：isolate / recover / set-dc / labels / taints
	Operator  string // 操作者显示名
	Remark    string // 备注
	Result    string // 结果：success / fail
	CreatedAt string // 创建时间
	UpdatedAt string // 更新时间
}

// opsNodeEventColumns holds the columns for the table ops_node_event.
var opsNodeEventColumns = OpsNodeEventColumns{
	Id:        "id",
	ClusterId: "cluster_id",
	NodeName:  "node_name",
	Action:    "action",
	Operator:  "operator",
	Remark:    "remark",
	Result:    "result",
	CreatedAt: "created_at",
	UpdatedAt: "updated_at",
}

// NewOpsNodeEventDao creates and returns a new DAO object for table data access.
func NewOpsNodeEventDao(handlers ...gdb.ModelHandler) *OpsNodeEventDao {
	return &OpsNodeEventDao{
		group:    "default",
		table:    "ops_node_event",
		columns:  opsNodeEventColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsNodeEventDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsNodeEventDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsNodeEventDao) Columns() OpsNodeEventColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsNodeEventDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsNodeEventDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsNodeEventDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsClusterDao is the data access object for the table ops_cluster.
type OpsClusterDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  OpsClusterColumns  // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// OpsClusterColumns defines and stores column names for the table ops_cluster.
type OpsClusterColumns struct {
	Id          string // 集群 ID
	Name        string // 由显示名称派生的稳定标识
	DisplayName string // 显示名称
	Description string // 说明
	Kubeconfig  string // Kubeconfig YAML，接口响应不回传
	ApiServer   string // 探测得到的 API Server 地址
	K8SVersion  string // 探测得到的 Kubernetes 版本
	Status      string // 连通状态：healthy / offline / unknown
	LastSyncAt  string // 最近一次成功连通时间
	CreatedAt   string // 创建时间
	UpdatedAt   string // 更新时间
	DeletedAt   string // 删除时间
}

// opsClusterColumns holds the columns for the table ops_cluster.
var opsClusterColumns = OpsClusterColumns{
	Id:          "id",
	Name:        "name",
	DisplayName: "display_name",
	Description: "description",
	Kubeconfig:  "kubeconfig",
	ApiServer:   "api_server",
	K8SVersion:  "k8s_version",
	Status:      "status",
	LastSyncAt:  "last_sync_at",
	CreatedAt:   "created_at",
	UpdatedAt:   "updated_at",
	DeletedAt:   "deleted_at",
}

// NewOpsClusterDao creates and returns a new DAO object for table data access.
func NewOpsClusterDao(handlers ...gdb.ModelHandler) *OpsClusterDao {
	return &OpsClusterDao{
		group:    "default",
		table:    "ops_cluster",
		columns:  opsClusterColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsClusterDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsClusterDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsClusterDao) Columns() OpsClusterColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsClusterDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsClusterDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsClusterDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

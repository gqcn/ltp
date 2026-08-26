// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsDatacenterDao is the data access object for the table ops_datacenter.
type OpsDatacenterDao struct {
	table    string               // table is the underlying table name of the DAO.
	group    string               // group is the database configuration group name of the current DAO.
	columns  OpsDatacenterColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler   // handlers for customized model modification.
}

// OpsDatacenterColumns defines and stores column names for the table ops_datacenter.
type OpsDatacenterColumns struct {
	Id          string // 数据中心 ID
	Code        string // 不可变业务标识，作为 maip.io/datacenter 标签值
	Name        string // 显示名称
	ShortName   string // 列表角标使用的简称
	Region      string // 区域文本
	LabelKey    string // Kubernetes 标签键，固定为 maip.io/datacenter
	Color       string // 角标颜色，格式 #RRGGBB
	Description string // 说明
	Enabled     string // 新建资源是否可选该数据中心
	IsDefault   string // 是否为内置默认数据中心
	CreatedAt   string // 创建时间
	UpdatedAt   string // 更新时间
	DeletedAt   string // 删除时间
}

// opsDatacenterColumns holds the columns for the table ops_datacenter.
var opsDatacenterColumns = OpsDatacenterColumns{
	Id:          "id",
	Code:        "code",
	Name:        "name",
	ShortName:   "short_name",
	Region:      "region",
	LabelKey:    "label_key",
	Color:       "color",
	Description: "description",
	Enabled:     "enabled",
	IsDefault:   "is_default",
	CreatedAt:   "created_at",
	UpdatedAt:   "updated_at",
	DeletedAt:   "deleted_at",
}

// NewOpsDatacenterDao creates and returns a new DAO object for table data access.
func NewOpsDatacenterDao(handlers ...gdb.ModelHandler) *OpsDatacenterDao {
	return &OpsDatacenterDao{
		group:    "default",
		table:    "ops_datacenter",
		columns:  opsDatacenterColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsDatacenterDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsDatacenterDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsDatacenterDao) Columns() OpsDatacenterColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsDatacenterDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsDatacenterDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsDatacenterDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

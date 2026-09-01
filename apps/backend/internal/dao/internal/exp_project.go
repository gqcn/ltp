// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// ExpProjectDao is the data access object for the table exp_project.
type ExpProjectDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  ExpProjectColumns  // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// ExpProjectColumns defines and stores column names for the table exp_project.
type ExpProjectColumns struct {
	Id          string // 项目 ID
	Name        string // 项目名称，创建后只读
	DisplayName string // 显示名称
	Description string // 描述
	Archived    string // 是否已归档
	CreatedAt   string // 创建时间
	UpdatedAt   string // 更新时间
	DeletedAt   string // 删除时间
}

// expProjectColumns holds the columns for the table exp_project.
var expProjectColumns = ExpProjectColumns{
	Id:          "id",
	Name:        "name",
	DisplayName: "display_name",
	Description: "description",
	Archived:    "archived",
	CreatedAt:   "created_at",
	UpdatedAt:   "updated_at",
	DeletedAt:   "deleted_at",
}

// NewExpProjectDao creates and returns a new DAO object for table data access.
func NewExpProjectDao(handlers ...gdb.ModelHandler) *ExpProjectDao {
	return &ExpProjectDao{
		group:    "default",
		table:    "exp_project",
		columns:  expProjectColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *ExpProjectDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *ExpProjectDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *ExpProjectDao) Columns() ExpProjectColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *ExpProjectDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *ExpProjectDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *ExpProjectDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

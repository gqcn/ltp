// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SysTeamDao is the data access object for the table sys_team.
type SysTeamDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  SysTeamColumns     // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// SysTeamColumns defines and stores column names for the table sys_team.
type SysTeamColumns struct {
	Id          string // 团队 ID
	Name        string // 团队名称
	Description string // 描述
	OwnerUserId string // 负责人用户 ID
	CreatedAt   string // 创建时间
	UpdatedAt   string // 更新时间
	DeletedAt   string // 删除时间
}

// sysTeamColumns holds the columns for the table sys_team.
var sysTeamColumns = SysTeamColumns{
	Id:          "id",
	Name:        "name",
	Description: "description",
	OwnerUserId: "owner_user_id",
	CreatedAt:   "created_at",
	UpdatedAt:   "updated_at",
	DeletedAt:   "deleted_at",
}

// NewSysTeamDao creates and returns a new DAO object for table data access.
func NewSysTeamDao(handlers ...gdb.ModelHandler) *SysTeamDao {
	return &SysTeamDao{
		group:    "default",
		table:    "sys_team",
		columns:  sysTeamColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *SysTeamDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *SysTeamDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *SysTeamDao) Columns() SysTeamColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *SysTeamDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *SysTeamDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *SysTeamDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

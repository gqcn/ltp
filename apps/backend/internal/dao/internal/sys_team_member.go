// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SysTeamMemberDao is the data access object for the table sys_team_member.
type SysTeamMemberDao struct {
	table    string               // table is the underlying table name of the DAO.
	group    string               // group is the database configuration group name of the current DAO.
	columns  SysTeamMemberColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler   // handlers for customized model modification.
}

// SysTeamMemberColumns defines and stores column names for the table sys_team_member.
type SysTeamMemberColumns struct {
	Id        string // 成员关系 ID
	TeamId    string // 团队 ID
	UserId    string // 用户 ID
	CreatedAt string // 加入时间
	UpdatedAt string // 更新时间
}

// sysTeamMemberColumns holds the columns for the table sys_team_member.
var sysTeamMemberColumns = SysTeamMemberColumns{
	Id:        "id",
	TeamId:    "team_id",
	UserId:    "user_id",
	CreatedAt: "created_at",
	UpdatedAt: "updated_at",
}

// NewSysTeamMemberDao creates and returns a new DAO object for table data access.
func NewSysTeamMemberDao(handlers ...gdb.ModelHandler) *SysTeamMemberDao {
	return &SysTeamMemberDao{
		group:    "default",
		table:    "sys_team_member",
		columns:  sysTeamMemberColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *SysTeamMemberDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *SysTeamMemberDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *SysTeamMemberDao) Columns() SysTeamMemberColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *SysTeamMemberDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *SysTeamMemberDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *SysTeamMemberDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

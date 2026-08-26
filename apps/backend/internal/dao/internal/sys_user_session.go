// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SysUserSessionDao is the data access object for the table sys_user_session.
type SysUserSessionDao struct {
	table    string                // table is the underlying table name of the DAO.
	group    string                // group is the database configuration group name of the current DAO.
	columns  SysUserSessionColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler    // handlers for customized model modification.
}

// SysUserSessionColumns defines and stores column names for the table sys_user_session.
type SysUserSessionColumns struct {
	Id        string // Session ID
	UserId    string // User ID
	TokenHash string // SHA-256 hex of the opaque session token
	UserAgent string // User agent at login
	IpAddress string // Client IP at login
	ExpiresAt string // Session expiration time
	RevokedAt string // Revocation time
	CreatedAt string // Creation time
	UpdatedAt string // Update time
}

// sysUserSessionColumns holds the columns for the table sys_user_session.
var sysUserSessionColumns = SysUserSessionColumns{
	Id:        "id",
	UserId:    "user_id",
	TokenHash: "token_hash",
	UserAgent: "user_agent",
	IpAddress: "ip_address",
	ExpiresAt: "expires_at",
	RevokedAt: "revoked_at",
	CreatedAt: "created_at",
	UpdatedAt: "updated_at",
}

// NewSysUserSessionDao creates and returns a new DAO object for table data access.
func NewSysUserSessionDao(handlers ...gdb.ModelHandler) *SysUserSessionDao {
	return &SysUserSessionDao{
		group:    "default",
		table:    "sys_user_session",
		columns:  sysUserSessionColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *SysUserSessionDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *SysUserSessionDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *SysUserSessionDao) Columns() SysUserSessionColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *SysUserSessionDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *SysUserSessionDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *SysUserSessionDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

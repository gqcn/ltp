// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SysLdapConfigDao is the data access object for the table sys_ldap_config.
type SysLdapConfigDao struct {
	table    string               // table is the underlying table name of the DAO.
	group    string               // group is the database configuration group name of the current DAO.
	columns  SysLdapConfigColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler   // handlers for customized model modification.
}

// SysLdapConfigColumns defines and stores column names for the table sys_ldap_config.
type SysLdapConfigColumns struct {
	Id              string // 配置 ID
	Code            string // 业务键，固定为 default
	Name            string // 配置名称
	Host            string // LDAP 主机
	Port            string // LDAP 端口
	UseTls          string // 是否使用 LDAPS
	BaseDn          string // 检索 Base DN
	BindDn          string // 服务账号 Bind DN
	BindPassword    string // 服务账号绑定密码，接口响应不得返回明文
	UserFilter      string // 用户认证 Filter，{username} 替换为登录账号
	SearchFilter    string // 目录搜索 Filter，{q} 替换为关键词
	AttrUsername    string // 账号属性名
	AttrName        string // 姓名属性名
	AttrEmail       string // 邮箱属性名
	AttrDepartment  string // 部门属性名
	AttrTitle       string // 职位属性名
	TimeoutSec      string // 连接超时秒数
	LastTestAt      string // 最近一次测试时间
	LastTestResult  string // 最近测试结果：success / fail，空表示尚未测试
	LastTestMessage string // 最近测试说明
	UpdatedBy       string // 最近保存者显示名
	CreatedAt       string // 创建时间
	UpdatedAt       string // 更新时间
}

// sysLdapConfigColumns holds the columns for the table sys_ldap_config.
var sysLdapConfigColumns = SysLdapConfigColumns{
	Id:              "id",
	Code:            "code",
	Name:            "name",
	Host:            "host",
	Port:            "port",
	UseTls:          "use_tls",
	BaseDn:          "base_dn",
	BindDn:          "bind_dn",
	BindPassword:    "bind_password",
	UserFilter:      "user_filter",
	SearchFilter:    "search_filter",
	AttrUsername:    "attr_username",
	AttrName:        "attr_name",
	AttrEmail:       "attr_email",
	AttrDepartment:  "attr_department",
	AttrTitle:       "attr_title",
	TimeoutSec:      "timeout_sec",
	LastTestAt:      "last_test_at",
	LastTestResult:  "last_test_result",
	LastTestMessage: "last_test_message",
	UpdatedBy:       "updated_by",
	CreatedAt:       "created_at",
	UpdatedAt:       "updated_at",
}

// NewSysLdapConfigDao creates and returns a new DAO object for table data access.
func NewSysLdapConfigDao(handlers ...gdb.ModelHandler) *SysLdapConfigDao {
	return &SysLdapConfigDao{
		group:    "default",
		table:    "sys_ldap_config",
		columns:  sysLdapConfigColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *SysLdapConfigDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *SysLdapConfigDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *SysLdapConfigDao) Columns() SysLdapConfigColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *SysLdapConfigDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *SysLdapConfigDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *SysLdapConfigDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

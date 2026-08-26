// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUser is the golang structure for table sys_user.
type SysUser struct {
	Id          int64       `json:"id"          orm:"id"            description:"用户 ID"`
	Username    string      `json:"username"    orm:"username"      description:"登录用户名"`
	Password    string      `json:"password"    orm:"password"      description:"密码哈希"`
	Nickname    string      `json:"nickname"    orm:"nickname"      description:"显示名称"`
	Status      int         `json:"status"      orm:"status"        description:"状态：1=启用 0=停用"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"    description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"    description:"更新时间"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"    description:"删除时间"`
	Email       string      `json:"email"       orm:"email"         description:"邮箱"`
	Department  string      `json:"department"  orm:"department"    description:"部门，通常映射自 LDAP ou"`
	Title       string      `json:"title"       orm:"title"         description:"职位"`
	RoleCode    string      `json:"roleCode"    orm:"role_code"     description:"平台角色编码：algo / sre，本地管理员为空"`
	Source      string      `json:"source"      orm:"source"        description:"账号来源：local=本地管理员 ldap=目录用户"`
	LastLoginAt *gtime.Time `json:"lastLoginAt" orm:"last_login_at" description:"最近登录时间"`
}

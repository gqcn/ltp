// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUser is the golang structure of table sys_user for DAO operations like Where/Data.
type SysUser struct {
	g.Meta      `orm:"table:sys_user, do:true"`
	Id          any         // 用户 ID
	Username    any         // 登录用户名
	Password    any         // 密码哈希
	Nickname    any         // 显示名称
	Status      any         // 状态：1=启用 0=停用
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
	DeletedAt   *gtime.Time // 删除时间
	Email       any         // 邮箱
	Department  any         // 部门，通常映射自 LDAP ou
	Title       any         // 职位
	RoleCode    any         // 平台角色编码：algo / sre，本地管理员为空
	Source      any         // 账号来源：local=本地管理员 ldap=目录用户
	LastLoginAt *gtime.Time // 最近登录时间
}

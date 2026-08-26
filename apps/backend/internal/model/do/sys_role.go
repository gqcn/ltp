// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysRole is the golang structure of table sys_role for DAO operations like Where/Data.
type SysRole struct {
	g.Meta      `orm:"table:sys_role, do:true"`
	Id          any         // 角色 ID
	Code        any         // 不可变角色编码：algo / sre
	Name        any         // 显示名称
	Description any         // 说明
	Menus       any         // 侧栏菜单分区 JSON 数组，取值 training / ops / platform
	Builtin     any         // 是否内置角色
	UpdatedBy   any         // 最近改名操作者显示名
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
}

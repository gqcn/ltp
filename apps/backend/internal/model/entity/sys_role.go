// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysRole is the golang structure for table sys_role.
type SysRole struct {
	Id          int64       `json:"id"          orm:"id"          description:"角色 ID"`
	Code        string      `json:"code"        orm:"code"        description:"不可变角色编码：algo / sre"`
	Name        string      `json:"name"        orm:"name"        description:"显示名称"`
	Description string      `json:"description" orm:"description" description:"说明"`
	Menus       string      `json:"menus"       orm:"menus"       description:"侧栏菜单分区 JSON 数组，取值 training / ops / platform"`
	Builtin     bool        `json:"builtin"     orm:"builtin"     description:"是否内置角色"`
	UpdatedBy   string      `json:"updatedBy"   orm:"updated_by"  description:"最近改名操作者显示名"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"  description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"  description:"更新时间"`
}

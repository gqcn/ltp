// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysTeam is the golang structure of table sys_team for DAO operations like Where/Data.
type SysTeam struct {
	g.Meta      `orm:"table:sys_team, do:true"`
	Id          any         // 团队 ID
	Name        any         // 团队名称
	Description any         // 描述
	OwnerUserId any         // 负责人用户 ID
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
	DeletedAt   *gtime.Time // 删除时间
}

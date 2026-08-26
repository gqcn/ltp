// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysTeamMember is the golang structure of table sys_team_member for DAO operations like Where/Data.
type SysTeamMember struct {
	g.Meta    `orm:"table:sys_team_member, do:true"`
	Id        any         // 成员关系 ID
	TeamId    any         // 团队 ID
	UserId    any         // 用户 ID
	CreatedAt *gtime.Time // 加入时间
	UpdatedAt *gtime.Time // 更新时间
}

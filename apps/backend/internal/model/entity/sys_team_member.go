// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysTeamMember is the golang structure for table sys_team_member.
type SysTeamMember struct {
	Id        int64       `json:"id"        orm:"id"         description:"成员关系 ID"`
	TeamId    int64       `json:"teamId"    orm:"team_id"    description:"团队 ID"`
	UserId    int64       `json:"userId"    orm:"user_id"    description:"用户 ID"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"加入时间"`
	UpdatedAt *gtime.Time `json:"updatedAt" orm:"updated_at" description:"更新时间"`
}

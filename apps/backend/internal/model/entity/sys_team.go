// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysTeam is the golang structure for table sys_team.
type SysTeam struct {
	Id          int64       `json:"id"          orm:"id"            description:"团队 ID"`
	Name        string      `json:"name"        orm:"name"          description:"团队名称"`
	Description string      `json:"description" orm:"description"   description:"描述"`
	OwnerUserId int64       `json:"ownerUserId" orm:"owner_user_id" description:"负责人用户 ID"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"    description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"    description:"更新时间"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"    description:"删除时间"`
}

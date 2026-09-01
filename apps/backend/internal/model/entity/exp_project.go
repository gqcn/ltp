// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// ExpProject is the golang structure for table exp_project.
type ExpProject struct {
	Id          int64       `json:"id"          orm:"id"           description:"项目 ID"`
	Name        string      `json:"name"        orm:"name"         description:"项目名称，创建后只读"`
	DisplayName string      `json:"displayName" orm:"display_name" description:"显示名称"`
	Description string      `json:"description" orm:"description"  description:"描述"`
	Archived    bool        `json:"archived"    orm:"archived"     description:"是否已归档"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"   description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"   description:"更新时间"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"   description:"删除时间"`
}

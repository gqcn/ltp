// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigDraft is the golang structure for table train_config_draft.
type TrainConfigDraft struct {
	Id            int64       `json:"id"            orm:"id"             description:"草稿 ID"`
	SetId         int64       `json:"setId"         orm:"set_id"         description:"配置集 ID"`
	OwnerUserId   int64       `json:"ownerUserId"   orm:"owner_user_id"  description:"草稿所有人 ID"`
	OwnerUsername string      `json:"ownerUsername" orm:"owner_username" description:"草稿所有人账号"`
	OwnerNickname string      `json:"ownerNickname" orm:"owner_nickname" description:"草稿所有人显示名"`
	Message       string      `json:"message"       orm:"message"        description:"拟发布版本说明"`
	Files         string      `json:"files"         orm:"files"          description:"草稿文件 JSON 数组"`
	CreatedAt     *gtime.Time `json:"createdAt"     orm:"created_at"     description:"创建时间"`
	UpdatedAt     *gtime.Time `json:"updatedAt"     orm:"updated_at"     description:"更新时间"`
}

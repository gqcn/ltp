// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigVersion is the golang structure for table train_config_version.
type TrainConfigVersion struct {
	Id             int64       `json:"id"             orm:"id"              description:"版本行 ID"`
	SetId          int64       `json:"setId"          orm:"set_id"          description:"配置集 ID"`
	Version        int         `json:"version"        orm:"version"         description:"版本号，从 1 递增"`
	Message        string      `json:"message"        orm:"message"         description:"版本说明"`
	AuthorUserId   int64       `json:"authorUserId"   orm:"author_user_id"  description:"发布人 ID"`
	AuthorUsername string      `json:"authorUsername" orm:"author_username" description:"发布人账号"`
	AuthorNickname string      `json:"authorNickname" orm:"author_nickname" description:"发布人显示名"`
	Digest         string      `json:"digest"         orm:"digest"          description:"文件内容摘要"`
	Files          string      `json:"files"          orm:"files"           description:"文件数组 JSON，含 path 与 content"`
	CreatedAt      *gtime.Time `json:"createdAt"      orm:"created_at"      description:"发布时间"`
	UpdatedAt      *gtime.Time `json:"updatedAt"      orm:"updated_at"      description:"更新时间"`
}

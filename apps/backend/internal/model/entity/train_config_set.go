// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigSet is the golang structure for table train_config_set.
type TrainConfigSet struct {
	Id            int64       `json:"id"            orm:"id"             description:"配置集 ID"`
	Name          string      `json:"name"          orm:"name"           description:"由显示名称派生的稳定标识"`
	DisplayName   string      `json:"displayName"   orm:"display_name"   description:"显示名称"`
	TeamId        int64       `json:"teamId"        orm:"team_id"        description:"所属团队"`
	Framework     string      `json:"framework"     orm:"framework"      description:"框架：megatron / nemo / accelerate / custom"`
	Visibility    string      `json:"visibility"    orm:"visibility"     description:"可见性：team / private"`
	Status        string      `json:"status"        orm:"status"         description:"状态：active / archived"`
	OwnerUserId   int64       `json:"ownerUserId"   orm:"owner_user_id"  description:"创建人 ID"`
	OwnerUsername string      `json:"ownerUsername" orm:"owner_username" description:"创建人账号"`
	OwnerNickname string      `json:"ownerNickname" orm:"owner_nickname" description:"创建人显示名"`
	Description   string      `json:"description"   orm:"description"    description:"描述"`
	LatestVersion int         `json:"latestVersion" orm:"latest_version" description:"最新已发布版本号，0 表示尚无版本"`
	CreatedAt     *gtime.Time `json:"createdAt"     orm:"created_at"     description:"创建时间"`
	UpdatedAt     *gtime.Time `json:"updatedAt"     orm:"updated_at"     description:"更新时间"`
	DeletedAt     *gtime.Time `json:"deletedAt"     orm:"deleted_at"     description:"删除时间"`
}

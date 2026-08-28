// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigDraft is the golang structure of table train_config_draft for DAO operations like Where/Data.
type TrainConfigDraft struct {
	g.Meta        `orm:"table:train_config_draft, do:true"`
	Id            any         // 草稿 ID
	SetId         any         // 配置集 ID
	OwnerUserId   any         // 草稿所有人 ID
	OwnerUsername any         // 草稿所有人账号
	OwnerNickname any         // 草稿所有人显示名
	Message       any         // 拟发布版本说明
	Files         any         // 草稿文件 JSON 数组
	CreatedAt     *gtime.Time // 创建时间
	UpdatedAt     *gtime.Time // 更新时间
}

// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigVersion is the golang structure of table train_config_version for DAO operations like Where/Data.
type TrainConfigVersion struct {
	g.Meta         `orm:"table:train_config_version, do:true"`
	Id             any         // 版本行 ID
	SetId          any         // 配置集 ID
	Version        any         // 版本号，从 1 递增
	Message        any         // 版本说明
	AuthorUserId   any         // 发布人 ID
	AuthorUsername any         // 发布人账号
	AuthorNickname any         // 发布人显示名
	Digest         any         // 文件内容摘要
	Files          any         // 文件数组 JSON，含 path 与 content
	CreatedAt      *gtime.Time // 发布时间
	UpdatedAt      *gtime.Time // 更新时间
}

// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainConfigSet is the golang structure of table train_config_set for DAO operations like Where/Data.
type TrainConfigSet struct {
	g.Meta        `orm:"table:train_config_set, do:true"`
	Id            any         // 配置集 ID
	Name          any         // 由显示名称派生的稳定标识
	DisplayName   any         // 显示名称
	TeamId        any         // 所属团队
	Framework     any         // 框架：megatron / nemo / accelerate / custom
	Visibility    any         // 可见性：team / private
	Status        any         // 状态：active / archived
	OwnerUserId   any         // 创建人 ID
	OwnerUsername any         // 创建人账号
	OwnerNickname any         // 创建人显示名
	Description   any         // 描述
	LatestVersion any         // 最新已发布版本号，0 表示尚无版本
	CreatedAt     *gtime.Time // 创建时间
	UpdatedAt     *gtime.Time // 更新时间
	DeletedAt     *gtime.Time // 删除时间
}

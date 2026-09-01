// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// ExpProject is the golang structure of table exp_project for DAO operations like Where/Data.
type ExpProject struct {
	g.Meta      `orm:"table:exp_project, do:true"`
	Id          any         // 项目 ID
	Name        any         // 项目名称，创建后只读
	DisplayName any         // 显示名称
	Description any         // 描述
	Archived    any         // 是否已归档
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
	DeletedAt   *gtime.Time // 删除时间
}

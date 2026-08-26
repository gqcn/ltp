// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsDatacenter is the golang structure of table ops_datacenter for DAO operations like Where/Data.
type OpsDatacenter struct {
	g.Meta      `orm:"table:ops_datacenter, do:true"`
	Id          any         // 数据中心 ID
	Code        any         // 不可变业务标识，作为 maip.io/datacenter 标签值
	Name        any         // 显示名称
	ShortName   any         // 列表角标使用的简称
	Region      any         // 区域文本
	LabelKey    any         // Kubernetes 标签键，固定为 maip.io/datacenter
	Color       any         // 角标颜色，格式 #RRGGBB
	Description any         // 说明
	Enabled     any         // 新建资源是否可选该数据中心
	IsDefault   any         // 是否为内置默认数据中心
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
	DeletedAt   *gtime.Time // 删除时间
}

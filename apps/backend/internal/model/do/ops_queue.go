// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsQueue is the golang structure of table ops_queue for DAO operations like Where/Data.
type OpsQueue struct {
	g.Meta         `orm:"table:ops_queue, do:true"`
	Id             any         // 队列 ID
	ClusterId      any         // 所属集群 ID
	Name           any         // Volcano Queue 对象名，创建后不可改
	DisplayName    any         // 显示名称
	DatacenterCode any         // 绑定的数据中心标识
	GpuType        any         // 卡型号
	GpuQuota       any         // GPU 额度（卡）
	CpuQuota       any         // CPU 额度（核）
	MemQuotaGi     any         // 内存额度（GiB）
	Weight         any         // Volcano 队列权重
	Reclaimable    any         // 是否允许回收
	Features       any         // 功能特性 JSON 数组，例如 ["ib"]
	Description    any         // 说明
	CreatedAt      *gtime.Time // 创建时间
	UpdatedAt      *gtime.Time // 更新时间
	DeletedAt      *gtime.Time // 删除时间
}

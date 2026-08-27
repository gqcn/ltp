// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsNodeEvent is the golang structure of table ops_node_event for DAO operations like Where/Data.
type OpsNodeEvent struct {
	g.Meta    `orm:"table:ops_node_event, do:true"`
	Id        any         // 记录 ID
	ClusterId any         // 所属集群 ID
	NodeName  any         // Kubernetes 节点名
	Action    any         // 动作：isolate / recover / set-dc / labels / taints
	Operator  any         // 操作者显示名
	Remark    any         // 备注
	Result    any         // 结果：success / fail
	CreatedAt *gtime.Time // 创建时间
	UpdatedAt *gtime.Time // 更新时间
}

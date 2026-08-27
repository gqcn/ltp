// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsAlert is the golang structure of table ops_alert for DAO operations like Where/Data.
type OpsAlert struct {
	g.Meta         `orm:"table:ops_alert, do:true"`
	Id             any         // 告警 ID
	ClusterId      any         // 可选关联集群 ID
	Severity       any         // 级别：info / warning / critical
	Title          any         // 告警标题
	AlertInfo      any         // 面向用户的告警信息
	FaultInfo      any         // 故障信息，可空
	Source         any         // 来源
	NodeNames      any         // 从标签解析的节点名，逗号分隔
	Status         any         // 处理状态：open / following / handled
	HandleRemark   any         // 最近处理备注
	HandledAt      *gtime.Time // 最近处理时间
	HandledBy      any         // 最近处理人
	FirstAlarmAt   *gtime.Time // FastX 首次告警时间
	AlarmCount     any         // FastX 告警次数
	AlarmLevel     any         // FastX 原始 level
	CreateUser     any         // FastX 创建人
	WebhookPayload any         // 原始 Webhook JSON
	CreatedAt      *gtime.Time // 入库时间
	UpdatedAt      *gtime.Time // 更新时间
}

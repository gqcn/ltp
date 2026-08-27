// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsAlert is the golang structure for table ops_alert.
type OpsAlert struct {
	Id             int64       `json:"id"             orm:"id"              description:"告警 ID"`
	ClusterId      int64       `json:"clusterId"      orm:"cluster_id"      description:"可选关联集群 ID"`
	Severity       string      `json:"severity"       orm:"severity"        description:"级别：info / warning / critical"`
	Title          string      `json:"title"          orm:"title"           description:"告警标题"`
	AlertInfo      string      `json:"alertInfo"      orm:"alert_info"      description:"面向用户的告警信息"`
	FaultInfo      string      `json:"faultInfo"      orm:"fault_info"      description:"故障信息，可空"`
	Source         string      `json:"source"         orm:"source"          description:"来源"`
	NodeNames      string      `json:"nodeNames"      orm:"node_names"      description:"从标签解析的节点名，逗号分隔"`
	Status         string      `json:"status"         orm:"status"          description:"处理状态：open / following / handled"`
	HandleRemark   string      `json:"handleRemark"   orm:"handle_remark"   description:"最近处理备注"`
	HandledAt      *gtime.Time `json:"handledAt"      orm:"handled_at"      description:"最近处理时间"`
	HandledBy      string      `json:"handledBy"      orm:"handled_by"      description:"最近处理人"`
	FirstAlarmAt   *gtime.Time `json:"firstAlarmAt"   orm:"first_alarm_at"  description:"FastX 首次告警时间"`
	AlarmCount     int         `json:"alarmCount"     orm:"alarm_count"     description:"FastX 告警次数"`
	AlarmLevel     int         `json:"alarmLevel"     orm:"alarm_level"     description:"FastX 原始 level"`
	CreateUser     string      `json:"createUser"     orm:"create_user"     description:"FastX 创建人"`
	WebhookPayload string      `json:"webhookPayload" orm:"webhook_payload" description:"原始 Webhook JSON"`
	CreatedAt      *gtime.Time `json:"createdAt"      orm:"created_at"      description:"入库时间"`
	UpdatedAt      *gtime.Time `json:"updatedAt"      orm:"updated_at"      description:"更新时间"`
}

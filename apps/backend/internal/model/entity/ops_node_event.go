// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsNodeEvent is the golang structure for table ops_node_event.
type OpsNodeEvent struct {
	Id        int64       `json:"id"        orm:"id"         description:"记录 ID"`
	ClusterId int64       `json:"clusterId" orm:"cluster_id" description:"所属集群 ID"`
	NodeName  string      `json:"nodeName"  orm:"node_name"  description:"Kubernetes 节点名"`
	Action    string      `json:"action"    orm:"action"     description:"动作：isolate / recover / set-dc / labels / taints"`
	Operator  string      `json:"operator"  orm:"operator"   description:"操作者显示名"`
	Remark    string      `json:"remark"    orm:"remark"     description:"备注"`
	Result    string      `json:"result"    orm:"result"     description:"结果：success / fail"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"创建时间"`
	UpdatedAt *gtime.Time `json:"updatedAt" orm:"updated_at" description:"更新时间"`
}

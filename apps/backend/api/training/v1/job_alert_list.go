// 本文件定义训练任务关联告警契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// RelatedAlert 是任务关联告警。
type RelatedAlert struct {
	Id        int64  `json:"id" dc:"告警 ID" eg:"1"`
	DisplayId string `json:"displayId" dc:"展示编号" eg:"ALT-1"`
	Severity  string `json:"severity" dc:"级别" eg:"warning"`
	Title     string `json:"title" dc:"标题" eg:"GPU 利用率告警"`
	Status    string `json:"status" dc:"处理状态" eg:"open"`
	NodeNames string `json:"nodeNames" dc:"节点名" eg:"gpu-node-h200"`
	CreatedAt int64  `json:"createdAt" dc:"入库时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListJobAlertsReq 列出与任务节点相交的告警。
type ListJobAlertsReq struct {
	g.Meta `path:"/training/jobs/{id}/alerts" method:"get" tags:"Training" summary:"列出任务关联告警" dc:"按任务 Pod 节点与告警 node_names 求交返回当前集群告警。" permission:"training:job:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"任务 ID" eg:"1"`
}

// ListJobAlertsRes 是关联告警列表。
type ListJobAlertsRes struct {
	List []*RelatedAlert `json:"list" dc:"关联告警"`
}

// RelatedJob 是告警关联的训练任务。
type RelatedJob struct {
	Id     int64  `json:"id" dc:"任务 ID" eg:"1"`
	Name   string `json:"name" dc:"任务名称" eg:"slm-7b-pretrain-phase4"`
	Status string `json:"status" dc:"任务状态" eg:"running"`
}

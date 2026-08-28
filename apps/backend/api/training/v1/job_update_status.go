// 本文件定义停止训练任务契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateJobStatusReq 停止任务。
type UpdateJobStatusReq struct {
	g.Meta `path:"/training/jobs/{id}/status" method:"put" tags:"Training" summary:"更新训练任务状态" dc:"目前仅允许将运行中、启动中或排队中的任务更新为 cancelled，对应 Volcano AbortJob。集群中 Job 已不存在时视为已停止并写 cancelled。" permission:"training:job:update"`
	Id     int64  `json:"id" v:"required|min:1" dc:"任务 ID" eg:"1"`
	Status string `json:"status" v:"required|in:cancelled#仅支持停止任务" dc:"目标状态。仅支持 cancelled。" eg:"cancelled"`
}

// UpdateJobStatusRes 为空。
type UpdateJobStatusRes struct{}

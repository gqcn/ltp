// 本文件定义训练任务 Pod 列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListJobPodsReq 列出任务 Pod。
type ListJobPodsReq struct {
	g.Meta `path:"/training/jobs/{id}/pods" method:"get" tags:"Training" summary:"列出任务 Pod" dc:"从工作集群读取该 Volcano Job 的 Pod 列表，并回写节点快照供告警关联。" permission:"training:job:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"任务 ID" eg:"1"`
}

// JobPod 是一个训练 Pod。
type JobPod struct {
	Name     string `json:"name" dc:"Pod 名" eg:"slm-7b-pretrain-phase4-worker-0"`
	Task     string `json:"task" dc:"Volcano task 名" eg:"worker"`
	Index    int    `json:"index" dc:"副本序号" eg:"0"`
	Node     string `json:"node" dc:"节点名" eg:"gpu-node-h200"`
	Phase    string `json:"phase" dc:"Pod 相位" eg:"Running"`
	Restarts int32  `json:"restarts" dc:"重启次数" eg:"0"`
	Role     string `json:"role" dc:"Master 或 Worker" eg:"Master"`
}

// ListJobPodsRes 是 Pod 列表。
type ListJobPodsRes struct {
	List []*JobPod `json:"list" dc:"Pod 列表"`
}

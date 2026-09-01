// 本文件定义训练任务列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListJobsReq 分页查询训练任务。
type ListJobsReq struct {
	g.Meta    `path:"/training/jobs" method:"get" tags:"Training" summary:"列出训练任务" dc:"按工作集群列出训练任务。算法工程师仅见自己加入的团队的任务；平台管理员与 SRE 可见全部团队。筛选与分页在数据库完成后再批量刷新 Volcano 相位。" permission:"training:job:query"`
	ClusterId int64  `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	PageNum   int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize  int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。" eg:"10"`
	Keyword   string `json:"keyword" dc:"可选模糊匹配任务名、创建人账号或显示名。" eg:"slm"`
	TeamId    int64  `json:"teamId" dc:"可选团队 ID。0 表示全部可见团队。" eg:"1"`
	QueueId   int64  `json:"queueId" dc:"可选队列 ID。0 表示全部。" eg:"1"`
	Status    string `json:"status" dc:"可选状态。all 或不传表示全部；queued / starting / running / success / failed / cancelled。" eg:"running"`
	Priority  string `json:"priority" dc:"可选优先级。all 或不传表示全部；P0 / P1 / P2 / P3。" eg:"P0"`
	Node      string `json:"node" dc:"可选节点名，匹配任务 Pod 节点快照，供告警跳转任务。" eg:"gpu-node-h200"`
}

// JobListItem 是任务列表行。
type JobListItem struct {
	Id                  int64    `json:"id" dc:"任务 ID" eg:"1"`
	ClusterId           int64    `json:"clusterId" dc:"集群 ID" eg:"1"`
	Name                string   `json:"name" dc:"任务名称" eg:"slm-7b-pretrain-phase4"`
	Status              string   `json:"status" dc:"状态。queued / starting / running / success / failed / cancelled。" eg:"running"`
	Priority            string   `json:"priority" dc:"优先级。P0 / P1 / P2 / P3。" eg:"P2"`
	TeamId              int64    `json:"teamId" dc:"团队 ID" eg:"1"`
	TeamName            string   `json:"teamName" dc:"团队名称" eg:"SLM预训练"`
	QueueId             int64    `json:"queueId" dc:"队列 ID" eg:"1"`
	QueueName           string   `json:"queueName" dc:"队列标识" eg:"lab-default"`
	QueueDisplayName    string   `json:"queueDisplayName" dc:"队列显示名" eg:"实验默认队列"`
	DatacenterCode      string   `json:"datacenterCode" dc:"数据中心标识" eg:"cq-lj"`
	DatacenterName      string   `json:"datacenterName" dc:"数据中心显示名称。未登记时为空。" eg:"重庆两江"`
	DatacenterShortName string   `json:"datacenterShortName" dc:"数据中心简称。未登记时为空。" eg:"两江"`
	DatacenterColor     string   `json:"datacenterColor" dc:"数据中心展示色。未登记时为空。" eg:"#3b82f6"`
	GpuType             string   `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	RequireIb           bool     `json:"requireIb" dc:"是否使用 IB" eg:"false"`
	Nodes               int      `json:"nodes" dc:"节点数" eg:"1"`
	GpusPerNode         int      `json:"gpusPerNode" dc:"每节点 GPU" eg:"8"`
	GpuCount            int      `json:"gpuCount" dc:"总 GPU" eg:"8"`
	CpuPerNode          int      `json:"cpuPerNode" dc:"每节点 CPU" eg:"16"`
	MemGiPerNode        int      `json:"memGiPerNode" dc:"每节点内存 GiB" eg:"128"`
	OwnerUsername       string   `json:"ownerUsername" dc:"运行用户账号" eg:"guoqiang"`
	OwnerNickname       string   `json:"ownerNickname" dc:"运行用户显示名" eg:"郭强"`
	SubmittedByUsername string   `json:"submittedByUsername" dc:"提交人账号" eg:"admin"`
	SubmittedByNickname string   `json:"submittedByNickname" dc:"提交人显示名" eg:"平台管理员"`
	DurationMs          int64    `json:"durationMs" dc:"已运行毫秒。未启动为 0。" eg:"3600000"`
	GpuHours            float64  `json:"gpuHours" dc:"已产生卡时" eg:"8.0"`
	SyncError           string   `json:"syncError" dc:"同步异常说明。正常为空。" eg:""`
	FailReason          string   `json:"failReason" dc:"失败原因。正常为空。" eg:""`
	RerunFromId         int64    `json:"rerunFromId" dc:"重跑源任务 ID。非重跑为 0。" eg:"0"`
	ExperimentId        int64    `json:"experimentId" dc:"关联实验 Run ID。无关联为 0。" eg:"1"`
	Loss                *float64 `json:"loss" dc:"关联实验最新 Loss。未上报为 null。" eg:"1.822"`
	Step                *int64   `json:"step" dc:"关联实验最新 step。未上报为 null。" eg:"21000"`
	MaxSteps            *int64   `json:"maxSteps" dc:"进度分母。未知为 null。" eg:"50000"`
	CreatedAt           int64    `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	StartedAt           int64    `json:"startedAt" dc:"启动时间，Unix 毫秒时间戳。未启动为 0。" eg:"0"`
	EndedAt             int64    `json:"endedAt" dc:"结束时间，Unix 毫秒时间戳。未结束为 0。" eg:"0"`
}

// ListJobsRes 是分页任务列表。
type ListJobsRes struct {
	List  []*JobListItem `json:"list" dc:"当前页任务"`
	Total int            `json:"total" dc:"筛选后总数" eg:"1"`
}

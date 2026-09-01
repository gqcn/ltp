// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainJob is the golang structure for table train_job.
type TrainJob struct {
	Id                  int64       `json:"id"                  orm:"id"                    description:"任务 ID"`
	ClusterId           int64       `json:"clusterId"           orm:"cluster_id"            description:"工作集群 ID"`
	Name                string      `json:"name"                orm:"name"                  description:"Volcano Job 对象名"`
	Namespace           string      `json:"namespace"           orm:"namespace"             description:"Kubernetes 命名空间，固定 maip"`
	TeamId              int64       `json:"teamId"              orm:"team_id"               description:"所属团队 ID"`
	TeamName            string      `json:"teamName"            orm:"team_name"             description:"提交时团队名称快照"`
	QueueId             int64       `json:"queueId"             orm:"queue_id"              description:"资源队列 ID"`
	QueueName           string      `json:"queueName"           orm:"queue_name"            description:"Volcano Queue 名快照"`
	QueueDisplayName    string      `json:"queueDisplayName"    orm:"queue_display_name"    description:"队列显示名快照"`
	DatacenterCode      string      `json:"datacenterCode"      orm:"datacenter_code"       description:"数据中心标识快照"`
	GpuType             string      `json:"gpuType"             orm:"gpu_type"              description:"卡型号快照"`
	RequireIb           bool        `json:"requireIb"           orm:"require_ib"            description:"是否使用 IB，取自队列特性"`
	Priority            string      `json:"priority"            orm:"priority"              description:"优先级：P0 / P1 / P2 / P3"`
	Status              string      `json:"status"              orm:"status"                description:"平台状态：queued / starting / running / success / failed / cancelled"`
	VolcanoPhase        string      `json:"volcanoPhase"        orm:"volcano_phase"         description:"最近一次 Volcano Job 相位"`
	VolcanoUid          string      `json:"volcanoUid"          orm:"volcano_uid"           description:"Volcano Job UID"`
	Nodes               int         `json:"nodes"               orm:"nodes"                 description:"节点数"`
	GpusPerNode         int         `json:"gpusPerNode"         orm:"gpus_per_node"         description:"每节点 GPU 数"`
	GpuCount            int         `json:"gpuCount"            orm:"gpu_count"             description:"总 GPU 卡数"`
	CpuPerNode          int         `json:"cpuPerNode"          orm:"cpu_per_node"          description:"每节点 CPU 核"`
	MemGiPerNode        int         `json:"memGiPerNode"        orm:"mem_gi_per_node"       description:"每节点内存 GiB"`
	Image               string      `json:"image"               orm:"image"                 description:"容器镜像"`
	Command             string      `json:"command"             orm:"command"               description:"启动命令"`
	Env                 string      `json:"env"                 orm:"env"                   description:"用户环境变量 JSON 对象"`
	Workdir             string      `json:"workdir"             orm:"workdir"               description:"容器工作路径"`
	OwnerUserId         int64       `json:"ownerUserId"         orm:"owner_user_id"         description:"运行用户 ID"`
	OwnerUsername       string      `json:"ownerUsername"       orm:"owner_username"        description:"运行用户账号"`
	OwnerNickname       string      `json:"ownerNickname"       orm:"owner_nickname"        description:"运行用户显示名"`
	SubmittedByUserId   int64       `json:"submittedByUserId"   orm:"submitted_by_user_id"  description:"提交人 ID"`
	SubmittedByUsername string      `json:"submittedByUsername" orm:"submitted_by_username" description:"提交人账号"`
	SubmittedByNickname string      `json:"submittedByNickname" orm:"submitted_by_nickname" description:"提交人显示名"`
	RerunFromId         int64       `json:"rerunFromId"         orm:"rerun_from_id"         description:"重跑源任务 ID"`
	FailReason          string      `json:"failReason"          orm:"fail_reason"           description:"失败原因"`
	ConfigMounts        string      `json:"configMounts"        orm:"config_mounts"         description:"配置挂载快照 JSON 数组"`
	PodNodes            string      `json:"podNodes"            orm:"pod_nodes"             description:"最近一次 Pod 节点名，逗号分隔"`
	SyncError           string      `json:"syncError"           orm:"sync_error"            description:"与 Volcano 同步失败说明"`
	StartedAt           *gtime.Time `json:"startedAt"           orm:"started_at"            description:"开始运行时间"`
	EndedAt             *gtime.Time `json:"endedAt"             orm:"ended_at"              description:"结束时间"`
	CreatedAt           *gtime.Time `json:"createdAt"           orm:"created_at"            description:"创建时间"`
	UpdatedAt           *gtime.Time `json:"updatedAt"           orm:"updated_at"            description:"更新时间"`
	DeletedAt           *gtime.Time `json:"deletedAt"           orm:"deleted_at"            description:"删除时间"`
	ListBucket          int         `json:"listBucket"          orm:"list_bucket"           description:"列表排序桶：0=排队中，1=其它"`
	PriorityOrder       int         `json:"priorityOrder"       orm:"priority_order"        description:"优先级排序：P0=0 P1=1 P2=2 P3=3"`
}

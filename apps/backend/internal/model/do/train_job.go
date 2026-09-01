// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// TrainJob is the golang structure of table train_job for DAO operations like Where/Data.
type TrainJob struct {
	g.Meta              `orm:"table:train_job, do:true"`
	Id                  any         // 任务 ID
	ClusterId           any         // 工作集群 ID
	Name                any         // Volcano Job 对象名
	Namespace           any         // Kubernetes 命名空间，固定 maip
	TeamId              any         // 所属团队 ID
	TeamName            any         // 提交时团队名称快照
	QueueId             any         // 资源队列 ID
	QueueName           any         // Volcano Queue 名快照
	QueueDisplayName    any         // 队列显示名快照
	DatacenterCode      any         // 数据中心标识快照
	GpuType             any         // 卡型号快照
	RequireIb           any         // 是否使用 IB，取自队列特性
	Priority            any         // 优先级：P0 / P1 / P2 / P3
	Status              any         // 平台状态：queued / starting / running / success / failed / cancelled
	VolcanoPhase        any         // 最近一次 Volcano Job 相位
	VolcanoUid          any         // Volcano Job UID
	Nodes               any         // 节点数
	GpusPerNode         any         // 每节点 GPU 数
	GpuCount            any         // 总 GPU 卡数
	CpuPerNode          any         // 每节点 CPU 核
	MemGiPerNode        any         // 每节点内存 GiB
	Image               any         // 容器镜像
	Command             any         // 启动命令
	Env                 any         // 用户环境变量 JSON 对象
	Workdir             any         // 容器工作路径
	OwnerUserId         any         // 运行用户 ID
	OwnerUsername       any         // 运行用户账号
	OwnerNickname       any         // 运行用户显示名
	SubmittedByUserId   any         // 提交人 ID
	SubmittedByUsername any         // 提交人账号
	SubmittedByNickname any         // 提交人显示名
	RerunFromId         any         // 重跑源任务 ID
	FailReason          any         // 失败原因
	ConfigMounts        any         // 配置挂载快照 JSON 数组
	PodNodes            any         // 最近一次 Pod 节点名，逗号分隔
	SyncError           any         // 与 Volcano 同步失败说明
	StartedAt           *gtime.Time // 开始运行时间
	EndedAt             *gtime.Time // 结束时间
	CreatedAt           *gtime.Time // 创建时间
	UpdatedAt           *gtime.Time // 更新时间
	DeletedAt           *gtime.Time // 删除时间
	ListBucket          any         // 列表排序桶：0=排队中，1=其它
	PriorityOrder       any         // 优先级排序：P0=0 P1=1 P2=2 P3=3
}

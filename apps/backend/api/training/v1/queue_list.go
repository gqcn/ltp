// 本文件定义「我的队列」列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListMyQueuesReq 列出当前用户可用的资源队列。
type ListMyQueuesReq struct {
	g.Meta    `path:"/training/queues" method:"get" tags:"Training" summary:"列出我的队列" dc:"返回当前工作集群中、与用户所属团队关联的队列额度、本月卡时与活跃任务。管理员可见全部已关联队列。" permission:"training:queue:query"`
	ClusterId int64 `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
}

// MyQueueJob 是嵌套在队列下的活跃任务。
type MyQueueJob struct {
	Id            int64   `json:"id" dc:"任务 ID" eg:"1"`
	Name          string  `json:"name" dc:"任务名称" eg:"slm-7b-pretrain"`
	Status        string  `json:"status" dc:"状态。queued / starting / running。" eg:"running"`
	Priority      string  `json:"priority" dc:"优先级。P0 / P1 / P2 / P3。" eg:"P2"`
	GpuCount      int     `json:"gpuCount" dc:"GPU 卡数" eg:"8"`
	GpuType       string  `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	CpuTotal      int     `json:"cpuTotal" dc:"总 CPU 核" eg:"128"`
	MemGiTotal    int     `json:"memGiTotal" dc:"总内存 GiB" eg:"1024"`
	OwnerNickname string  `json:"ownerNickname" dc:"运行用户显示名" eg:"郭强"`
	GpuHours      float64 `json:"gpuHours" dc:"已产生卡时，排队中为 0。" eg:"12.5"`
	DurationMs    int64   `json:"durationMs" dc:"已运行毫秒。排队中为 0。" eg:"3600000"`
}

// MyQueueItem 是一条用户侧队列。
type MyQueueItem struct {
	Id             int64         `json:"id" dc:"队列 ID" eg:"1"`
	Name           string        `json:"name" dc:"Volcano Queue 名" eg:"lab-default"`
	DisplayName    string        `json:"displayName" dc:"显示名称" eg:"实验默认队列"`
	DatacenterCode string        `json:"datacenterCode" dc:"数据中心标识" eg:"cq-lj"`
	GpuType        string        `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	GpuQuota       int           `json:"gpuQuota" dc:"GPU 额度" eg:"8"`
	GpuUsed        int           `json:"gpuUsed" dc:"GPU 已用" eg:"2"`
	CpuQuota       int           `json:"cpuQuota" dc:"CPU 额度" eg:"32"`
	CpuUsed        int           `json:"cpuUsed" dc:"CPU 已用" eg:"8"`
	MemQuotaGi     int           `json:"memQuotaGi" dc:"内存额度 GiB" eg:"64"`
	MemUsedGi      int           `json:"memUsedGi" dc:"内存已用 GiB" eg:"16"`
	Features       []string      `json:"features" dc:"功能特性" eg:"[\"ib\"]"`
	Enabled        bool          `json:"enabled" dc:"是否启用" eg:"true"`
	State          string        `json:"state" dc:"Volcano 状态" eg:"Open"`
	SyncError      string        `json:"syncError" dc:"同步异常说明。正常为空。" eg:""`
	Teams          []TeamItem    `json:"teams" dc:"关联团队"`
	GpuHoursMonth  float64       `json:"gpuHoursMonth" dc:"本月卡时" eg:"120.5"`
	Running        int           `json:"running" dc:"运行中任务数" eg:"1"`
	Pending        int           `json:"pending" dc:"排队中任务数" eg:"0"`
	ActiveJobs     []*MyQueueJob `json:"activeJobs" dc:"运行中与排队中的任务"`
}

// MyQueueSummary 是顶部汇总。
type MyQueueSummary struct {
	GpuQuota        int     `json:"gpuQuota" dc:"GPU 额度合计" eg:"8"`
	GpuUsed         int     `json:"gpuUsed" dc:"GPU 已用合计" eg:"2"`
	CpuQuota        int     `json:"cpuQuota" dc:"CPU 额度合计" eg:"32"`
	CpuUsed         int     `json:"cpuUsed" dc:"CPU 已用合计" eg:"8"`
	MemQuotaGi      int     `json:"memQuotaGi" dc:"内存额度合计 GiB" eg:"64"`
	MemUsedGi       int     `json:"memUsedGi" dc:"内存已用合计 GiB" eg:"16"`
	GpuHoursMonth   float64 `json:"gpuHoursMonth" dc:"本月卡时合计" eg:"120.5"`
	GpuHoursRunning float64 `json:"gpuHoursRunning" dc:"运行中任务已产生卡时" eg:"12.5"`
	Running         int     `json:"running" dc:"运行中任务数" eg:"1"`
	Pending         int     `json:"pending" dc:"排队中任务数" eg:"0"`
}

// ListMyQueuesRes 是我的队列页数据。
type ListMyQueuesRes struct {
	Summary MyQueueSummary `json:"summary" dc:"额度与卡时汇总"`
	List    []*MyQueueItem `json:"list" dc:"队列列表"`
}

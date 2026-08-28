// 本文件定义队列列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// TeamRef 是关联团队投影。
type TeamRef struct {
	Id   int64  `json:"id" dc:"团队 ID" eg:"1"`
	Name string `json:"name" dc:"团队名称" eg:"SLM预训练"`
}

// ListReq 查询分页队列。
type ListReq struct {
	g.Meta         `path:"/queues" method:"get" tags:"Queue" summary:"列出队列" dc:"按工作集群列出业务队列。已用额度优先取自 Volcano Queue.status.allocated。团队名称与本月卡时批量投影。可选按启用状态筛选。" permission:"ops:queue:query"`
	ClusterId      int64  `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	PageNum        int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize       int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。" eg:"10"`
	Keyword        string `json:"keyword" dc:"可选模糊匹配标识、显示名、说明或团队名。" eg:"lab"`
	DatacenterCode string `json:"datacenterCode" dc:"可选数据中心标识。空表示全部。" eg:"cq-lj"`
	GpuType        string `json:"gpuType" dc:"可选卡型号。空表示全部。" eg:"H100-80G"`
	Enabled        *bool  `json:"enabled" dc:"可选启用状态过滤。省略返回全部，true 为启用（Volcano Open），false 为禁用（Closed、Closing 或同步异常）。" eg:"true"`
}

// ListItem 是列表中的一条队列。
type ListItem struct {
	Id             int64     `json:"id" dc:"队列 ID" eg:"1"`
	ClusterId      int64     `json:"clusterId" dc:"所属集群 ID" eg:"1"`
	Name           string    `json:"name" dc:"Volcano Queue 对象名" eg:"lab-default"`
	DisplayName    string    `json:"displayName" dc:"显示名称" eg:"实验默认队列"`
	Description    string    `json:"description" dc:"说明" eg:"kind 验收队列"`
	DatacenterCode string    `json:"datacenterCode" dc:"数据中心标识" eg:"cq-lj"`
	GpuType        string    `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	GpuQuota       int       `json:"gpuQuota" dc:"GPU 额度（卡）" eg:"8"`
	GpuUsed        int       `json:"gpuUsed" dc:"GPU 已用（卡），来自 Volcano allocated" eg:"0"`
	CpuQuota       int       `json:"cpuQuota" dc:"CPU 额度（核）" eg:"32"`
	CpuUsed        int       `json:"cpuUsed" dc:"CPU 已用（核）" eg:"0"`
	MemQuotaGi     int       `json:"memQuotaGi" dc:"内存额度（GiB）" eg:"64"`
	MemUsedGi      int       `json:"memUsedGi" dc:"内存已用（GiB）" eg:"0"`
	Weight         int       `json:"weight" dc:"Volcano 权重" eg:"1"`
	Reclaimable    bool      `json:"reclaimable" dc:"是否允许回收" eg:"true"`
	Features       []string  `json:"features" dc:"功能特性，如 ib" eg:"[]"`
	Enabled        bool      `json:"enabled" dc:"是否启用（对应 Volcano Open/Closed）" eg:"true"`
	GpuHoursMonth  float64   `json:"gpuHoursMonth" dc:"本月卡时。按 GPU 数 × 运行时长计算，排队中不计；无任务为 0。" eg:"12.5"`
	State          string    `json:"state" dc:"Volcano 状态。Open / Closed / Unknown。" eg:"Open"`
	Pending        int       `json:"pending" dc:"排队中的 PodGroup 数" eg:"0"`
	Running        int       `json:"running" dc:"运行中的 PodGroup 数" eg:"0"`
	SyncError      string    `json:"syncError" dc:"与 Volcano 同步失败时的说明。正常为空字符串。" eg:""`
	Teams          []TeamRef `json:"teams" dc:"关联团队"`
	CreatedAt      int64     `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	UpdatedAt      int64     `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListRes 是分页队列列表。
type ListRes struct {
	List  []*ListItem `json:"list" dc:"当前页队列"`
	Total int         `json:"total" dc:"筛选后总数" eg:"1"`
}

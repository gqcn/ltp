// 本文件定义团队关联队列的读写契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// QueueOption 是管理队列弹窗中的候选项。
type QueueOption struct {
	Id                  int64  `json:"id" dc:"队列 ID" eg:"1"`
	Name                string `json:"name" dc:"队列标识" eg:"lab-default"`
	DisplayName         string `json:"displayName" dc:"显示名称" eg:"实验默认队列"`
	DatacenterCode      string `json:"datacenterCode" dc:"数据中心标识" eg:"cq-lj"`
	DatacenterName      string `json:"datacenterName" dc:"数据中心显示名称。未登记时为空。" eg:"重庆两江"`
	DatacenterShortName string `json:"datacenterShortName" dc:"数据中心简称。未登记时为空。" eg:"两江"`
	DatacenterColor     string `json:"datacenterColor" dc:"数据中心展示色。未登记时为空。" eg:"#3b82f6"`
	GpuType             string `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	GpuQuota            int    `json:"gpuQuota" dc:"GPU 额度" eg:"8"`
	GpuUsed             int    `json:"gpuUsed" dc:"GPU 已用" eg:"0"`
	Enabled             bool   `json:"enabled" dc:"是否启用" eg:"true"`
	State               string `json:"state" dc:"Volcano 状态" eg:"Open"`
}

// ListQueueOptionsReq 列出可供团队绑定的队列。
type ListQueueOptionsReq struct {
	g.Meta   `path:"/teams/queue-options" method:"get" tags:"Team" summary:"列出可绑定队列" dc:"供团队详情「管理队列」勾选。不按工作集群过滤。队列模块未装配时返回空列表。关键词匹配标识或显示名。" permission:"platform:team:query"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配标识或显示名。省略不过滤。" eg:"lab"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize int    `json:"pageSize" d:"50" v:"min:1|max:100" dc:"每页条数，默认 50，最多 100。" eg:"50"`
}

// ListQueueOptionsRes 是队列候选项分页。
type ListQueueOptionsRes struct {
	List  []QueueOption `json:"list" dc:"当前页候选项"`
	Total int           `json:"total" dc:"筛选后总数" eg:"2"`
}

// ReplaceQueuesReq 全量替换团队关联的队列。
type ReplaceQueuesReq struct {
	g.Meta   `path:"/teams/{id}/queues" method:"put" tags:"Team" summary:"替换团队关联队列" dc:"按所选队列 ID 全量替换该团队绑定。空数组解除全部绑定，不修改其他团队在这些队列上的绑定。最多 100 个。所选队列必须存在。" permission:"platform:team:update"`
	Id       int64   `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
	QueueIds []int64 `json:"queueIds" v:"max-length:100#单次最多关联 100 个队列" dc:"队列 ID 列表。可为空，表示解除全部绑定。最多 100 个。" eg:"[]"`
}

// ReplaceQueuesRes 为空。
type ReplaceQueuesRes struct{}

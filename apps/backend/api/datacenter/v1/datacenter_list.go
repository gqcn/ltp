// 本文件定义数据中心列表接口契约，含 KPI 汇总字段。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询分页数据中心列表。
type ListReq struct {
	g.Meta   `path:"/datacenters" method:"get" tags:"Datacenter" summary:"列出数据中心" dc:"按关键词、启用状态和分页查询数据中心。筛选、排序与分页在返回当前页之前于数据库侧完成。关联计数批量装配，在节点、队列、集群模块接入前恒为 0。" permission:"ops:datacenter:query"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。省略时默认为 1。" eg:"1"`
	PageSize int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配标识、名称、简称、区域或说明。空表示不按关键词过滤。" eg:"两江"`
	Enabled  *bool  `json:"enabled" dc:"可选启用状态过滤。省略返回全部，true 为启用，false 为停用。" eg:"true"`
}

// UsageItem 是单个数据中心的关联计数投影。
type UsageItem struct {
	Nodes    int `json:"nodes" dc:"关联节点数。节点模块接入前恒为 0。" eg:"0"`
	Queues   int `json:"queues" dc:"关联队列数。队列模块接入前恒为 0。" eg:"0"`
	Clusters int `json:"clusters" dc:"关联集群数。集群模块接入前恒为 0。" eg:"0"`
}

// ListItem 是列表响应中的一行数据中心。
type ListItem struct {
	Id          int64     `json:"id" dc:"数据中心 ID" eg:"1"`
	Code        string    `json:"code" dc:"不可变业务标识，作为 maip.io/datacenter 标签值" eg:"cq-lj"`
	Name        string    `json:"name" dc:"显示名称" eg:"重庆两江"`
	ShortName   string    `json:"shortName" dc:"列表角标使用的简称" eg:"两江"`
	Region      string    `json:"region" dc:"区域文本。未设置时为空字符串。" eg:"重庆"`
	LabelKey    string    `json:"labelKey" dc:"Kubernetes 标签键，固定为 maip.io/datacenter" eg:"maip.io/datacenter"`
	Label       string    `json:"label" dc:"完整标签表达式 maip.io/datacenter=<标识>" eg:"maip.io/datacenter=cq-lj"`
	Color       string    `json:"color" dc:"角标颜色，格式 #RRGGBB" eg:"#3b82f6"`
	Description string    `json:"description" dc:"说明" eg:"两江数据中心"`
	Enabled     bool      `json:"enabled" dc:"数据中心是否启用" eg:"true"`
	IsDefault   bool      `json:"isDefault" dc:"历史字段，恒为 false。系统不再内置默认数据中心。" eg:"false"`
	Usage       UsageItem `json:"usage" dc:"批量装配的关联计数"`
	CreatedAt   int64     `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	UpdatedAt   int64     `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListSummary 是页面 KPI 使用的未筛选库存快照。
type ListSummary struct {
	Total    int `json:"total" dc:"未筛选的数据中心总数" eg:"4"`
	Enabled  int `json:"enabled" dc:"未筛选的启用数量" eg:"4"`
	Disabled int `json:"disabled" dc:"未筛选的停用数量" eg:"0"`
}

// ListRes 是分页数据中心列表。
type ListRes struct {
	List    []*ListItem `json:"list" dc:"当前页数据中心列表" eg:"[]"`
	Total   int         `json:"total" dc:"筛选后的匹配总数" eg:"4"`
	Summary ListSummary `json:"summary" dc:"与当前搜索无关的未筛选 KPI 快照"`
}

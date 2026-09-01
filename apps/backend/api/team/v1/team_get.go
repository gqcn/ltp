// 本文件定义团队详情接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// MemberItem 是团队成员投影。
type MemberItem struct {
	Id         int64  `json:"id" dc:"用户 ID" eg:"3"`
	Username   string `json:"username" dc:"域账号" eg:"guoqiang"`
	Nickname   string `json:"nickname" dc:"显示名称" eg:"郭强"`
	Email      string `json:"email" dc:"邮箱" eg:"guoqiang@msxf.com"`
	Department string `json:"department" dc:"部门" eg:"人工智能中心 / SLM"`
}

// QueueRef 是团队已关联队列的只读投影。
type QueueRef struct {
	Id                  int64  `json:"id" dc:"队列 ID" eg:"1"`
	Name                string `json:"name" dc:"队列标识" eg:"lab-default"`
	DisplayName         string `json:"displayName" dc:"显示名称" eg:"实验默认队列"`
	DatacenterCode      string `json:"datacenterCode" dc:"数据中心标识" eg:"cq-lj"`
	DatacenterName      string `json:"datacenterName" dc:"数据中心显示名称。未登记时为空。" eg:"重庆两江"`
	DatacenterShortName string `json:"datacenterShortName" dc:"数据中心简称。未登记时为空。" eg:"两江"`
	DatacenterColor     string `json:"datacenterColor" dc:"数据中心展示色。未登记时为空。" eg:"#3b82f6"`
	GpuType             string `json:"gpuType" dc:"卡型号" eg:"NVIDIA-H200"`
	Enabled             bool   `json:"enabled" dc:"是否启用" eg:"true"`
	State               string `json:"state" dc:"Volcano 状态" eg:"Open"`
}

// GetReq 读取一条团队详情，含成员列表。
type GetReq struct {
	g.Meta `path:"/teams/{id}" method:"get" tags:"Team" summary:"获取团队详情" dc:"返回团队元数据、负责人、成员列表与已关联队列。成员与队列均一次批量加载。队列绑定可在队列管理或团队详情「管理队列」中维护。" permission:"platform:team:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
}

// GetRes 是团队详情。
type GetRes struct {
	Id          int64        `json:"id" dc:"团队 ID" eg:"1"`
	Name        string       `json:"name" dc:"团队名称" eg:"SLM预训练"`
	Description string       `json:"description" dc:"描述" eg:"小模型预训练主线"`
	Owner       OwnerRef     `json:"owner" dc:"负责人投影"`
	Members     []MemberItem `json:"members" dc:"成员列表，含负责人"`
	Queues      []QueueRef   `json:"queues" dc:"已关联队列。无关联时为空数组。"`
	CreatedAt   int64        `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	UpdatedAt   int64        `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

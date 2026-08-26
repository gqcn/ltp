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

// GetReq 读取一条团队详情，含成员列表。
type GetReq struct {
	g.Meta `path:"/teams/{id}" method:"get" tags:"Team" summary:"获取团队详情" dc:"返回团队元数据、负责人与成员列表。成员一次批量加载。本迭代不返回队列关联。" permission:"platform:team:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
}

// GetRes 是团队详情。
type GetRes struct {
	Id          int64        `json:"id" dc:"团队 ID" eg:"1"`
	Name        string       `json:"name" dc:"团队名称" eg:"SLM预训练"`
	Description string       `json:"description" dc:"描述" eg:"小模型预训练主线"`
	Owner       OwnerRef     `json:"owner" dc:"负责人投影"`
	Members     []MemberItem `json:"members" dc:"成员列表，含负责人"`
	CreatedAt   int64        `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	UpdatedAt   int64        `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

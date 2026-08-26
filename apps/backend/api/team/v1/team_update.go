// 本文件定义更新团队接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateReq 修改团队名称、描述与负责人。
type UpdateReq struct {
	g.Meta      `path:"/teams/{id}" method:"put" tags:"Team" summary:"更新团队" dc:"修改团队名称、描述与负责人。名称必须唯一。新负责人必须是启用中的平台用户，并自动加入成员。" permission:"platform:team:update"`
	Id          int64  `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
	Name        string `json:"name" v:"required" dc:"团队名称，必须唯一" eg:"SLM预训练"`
	Description string `json:"description" dc:"描述" eg:"小模型预训练主线"`
	OwnerUserId int64  `json:"ownerUserId" v:"required|min:1" dc:"负责人用户 ID" eg:"3"`
}

// UpdateRes 成功时为空。
type UpdateRes struct{}

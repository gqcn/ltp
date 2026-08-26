// 本文件定义创建团队接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateReq 创建一条虚拟团队。
type CreateReq struct {
	g.Meta      `path:"/teams" method:"post" tags:"Team" summary:"创建团队" dc:"创建虚拟团队。名称必须唯一。负责人必须是启用中的平台用户，创建后自动成为成员。" permission:"platform:team:create"`
	Name        string `json:"name" v:"required" dc:"团队名称，必须唯一" eg:"新研究组"`
	Description string `json:"description" dc:"可选描述" eg:"临时实验团队"`
	OwnerUserId int64  `json:"ownerUserId" v:"required|min:1" dc:"负责人用户 ID，必须为启用中的平台 LDAP 用户" eg:"3"`
}

// CreateRes 返回新团队 ID。
type CreateRes struct {
	Id int64 `json:"id" dc:"新团队 ID" eg:"5"`
}

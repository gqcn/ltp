// 本文件定义移除团队成员接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// RemoveMemberReq 从团队移除一名成员。
type RemoveMemberReq struct {
	g.Meta `path:"/teams/{id}/members/{userId}" method:"delete" tags:"Team" summary:"移除团队成员" dc:"解除用户与团队的成员关系。不删除用户账号。" permission:"platform:team:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
	UserId int64 `json:"userId" v:"required|min:1" dc:"要移除的用户 ID" eg:"4"`
}

// RemoveMemberRes 成功时为空。
type RemoveMemberRes struct{}

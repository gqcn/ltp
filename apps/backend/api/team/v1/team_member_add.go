// 本文件定义添加团队成员接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// AddMemberReq 向团队添加一名启用中的平台用户。
type AddMemberReq struct {
	g.Meta `path:"/teams/{id}/members" method:"post" tags:"Team" summary:"添加团队成员" dc:"从平台可用且启用的用户中添加成员。已在团队中则保持幂等成功。" permission:"platform:team:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"团队 ID" eg:"1"`
	UserId int64 `json:"userId" v:"required|min:1" dc:"要加入的平台用户 ID" eg:"4"`
}

// AddMemberRes 成功时为空。
type AddMemberRes struct{}

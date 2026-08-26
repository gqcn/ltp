// 本文件定义批量移除平台用户的接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteReq 从平台可用列表批量移除用户。
type DeleteReq struct {
	g.Meta `path:"/users" method:"delete" tags:"User" summary:"移除平台用户" dc:"软删除平台用户并解除团队成员关系。不得移除当前登录用户。之后可再次从 LDAP 添加。单次最多 100 个 ID。" permission:"platform:user:delete"`
	Ids    []int64 `json:"ids" v:"required" dc:"用户 ID 列表。上限 100。" eg:"[2]"`
}

// DeleteRes 返回实际移除人数。
type DeleteRes struct {
	Removed int `json:"removed" dc:"实际移除的用户数" eg:"1"`
}

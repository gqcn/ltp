// 本文件定义批量启用或停用平台用户的接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateStatusReq 批量启用或停用平台用户。
type UpdateStatusReq struct {
	g.Meta  `path:"/users/status" method:"put" tags:"User" summary:"更新用户状态" dc:"批量启用或停用平台用户。已是目标状态的用户会被跳过。停用后无法 LDAP 登录，团队关系保留。单次最多 100 个 ID。" permission:"platform:user:update"`
	Ids     []int64 `json:"ids" v:"required" dc:"用户 ID 列表。上限 100。" eg:"[2]"`
	Enabled bool    `json:"enabled" dc:"目标启用状态。true 启用，false 停用。" eg:"false"`
}

// UpdateStatusRes 返回实际变更人数。
type UpdateStatusRes struct {
	Updated int `json:"updated" dc:"实际状态发生变化的用户数" eg:"1"`
}

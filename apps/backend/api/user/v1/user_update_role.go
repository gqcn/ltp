// 本文件定义批量角色授权接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateRoleReq 批量为平台用户指定角色。
type UpdateRoleReq struct {
	g.Meta   `path:"/users/role" method:"put" tags:"User" summary:"更新用户角色" dc:"批量为平台用户指定内置角色。角色编码必须为 algo 或 sre。单次最多 100 个 ID。" permission:"platform:user:update"`
	Ids      []int64 `json:"ids" v:"required" dc:"用户 ID 列表。上限 100。" eg:"[2]"`
	RoleCode string  `json:"roleCode" v:"required" dc:"目标角色编码。取值 algo 或 sre。" eg:"sre"`
}

// UpdateRoleRes 返回实际授权人数。
type UpdateRoleRes struct {
	Updated int `json:"updated" dc:"实际完成授权的用户数" eg:"1"`
}

// 本文件定义角色改名接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateReq 修改角色显示名称。
type UpdateReq struct {
	g.Meta `path:"/roles/{id}" method:"put" tags:"Role" summary:"更新角色名称" dc:"修改内置角色的显示名称，不影响角色编码、菜单范围或已分配用户的权限。名称最长 32 个字符且不可与其他角色重名。" permission:"platform:role:update"`
	Id     int64  `json:"id" v:"required|min:1" dc:"角色 ID" eg:"1"`
	Name   string `json:"name" v:"required|max-length:32#请输入角色名称|最长 32 个字符" dc:"新的显示名称，最长 32 个字符（角色名特例）" eg:"算法专家"`
}

// UpdateRes 成功时为空。
type UpdateRes struct{}

// 本文件定义从 LDAP 添加平台用户的接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateReq 从 LDAP 目录批量加入平台用户。
type CreateReq struct {
	g.Meta    `path:"/users" method:"post" tags:"User" summary:"从 LDAP 添加用户" dc:"按当前 LDAP 配置查找目录用户，将尚未加入平台的账号批量加入可用用户列表，并指定统一角色。已存在的账号会被跳过。单次最多 100 个账号。" permission:"platform:user:create"`
	Usernames []string `json:"usernames" v:"required#请至少勾选一名 LDAP 用户" dc:"要加入的 LDAP 账号列表。上限 100。已在平台中的账号会被跳过。" eg:"[\"sunlei\"]"`
	RoleCode  string   `json:"roleCode" v:"required#请选择角色" dc:"统一授予的角色编码。取值 algo 或 sre。" eg:"algo"`
}

// CreateRes 返回实际新增的人数。
type CreateRes struct {
	Added int `json:"added" dc:"实际新增的用户数。已存在账号不计入。" eg:"1"`
}

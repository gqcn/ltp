// 本文件定义当前会话接口契约与对外用户 DTO。

package v1

import "github.com/gogf/gf/v2/frame/g"

// SessionUser 是登录与会话读取返回的对外身份。
type SessionUser struct {
	Id         int64    `json:"id" dc:"用户 ID" eg:"1"`
	Username   string   `json:"username" dc:"登录用户名" eg:"admin"`
	Nickname   string   `json:"nickname" dc:"显示名称" eg:"平台管理员"`
	Email      string   `json:"email" dc:"邮箱。未设置时为空字符串。" eg:"admin@maip.local"`
	Department string   `json:"department" dc:"部门。未设置时为空字符串。" eg:"系统内置"`
	Title      string   `json:"title" dc:"职位。未设置时为空字符串。" eg:"平台管理员"`
	Source     string   `json:"source" dc:"账号来源。local 为本地管理员，ldap 为目录用户。" eg:"local"`
	RoleCode   string   `json:"roleCode" dc:"平台角色编码。本地管理员为空字符串；目录用户为 algo 或 sre。" eg:""`
	RoleName   string   `json:"roleName" dc:"角色显示名称。本地管理员为平台管理员。" eg:"平台管理员"`
	Menus      []string `json:"menus" dc:"可访问的侧栏菜单分区。取值 training、ops、platform。实际渲染还要与已启用模块求交。" eg:"[\"ops\",\"platform\"]"`
	IsAdmin    bool     `json:"isAdmin" dc:"是否为本地平台管理员。管理员拥有全部菜单分区。" eg:"true"`
}

// SessionReq 从会话 Cookie 读取当前浏览器会话。
type SessionReq struct {
	g.Meta `path:"/auth/session" method:"get" tags:"Authentication" summary:"当前会话" dc:"返回当前 HttpOnly 会话 Cookie 对应的已认证用户。"`
}

// SessionRes 返回当前会话对应的已认证用户。
type SessionRes struct {
	User SessionUser `json:"user" dc:"已认证用户资料"`
}

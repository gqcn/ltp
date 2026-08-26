// 本文件定义当前会话接口契约与对外用户 DTO。

package v1

import "github.com/gogf/gf/v2/frame/g"

// SessionUser 是登录与会话读取返回的对外身份。
type SessionUser struct {
	Id       int64  `json:"id" dc:"用户 ID" eg:"1"`
	Username string `json:"username" dc:"登录用户名" eg:"admin"`
	Nickname string `json:"nickname" dc:"显示名称" eg:"平台管理员"`
}

// SessionReq 从会话 Cookie 读取当前浏览器会话。
type SessionReq struct {
	g.Meta `path:"/auth/session" method:"get" tags:"Authentication" summary:"当前会话" dc:"返回当前 HttpOnly 会话 Cookie 对应的已认证用户。"`
}

// SessionRes 返回当前会话对应的已认证用户。
type SessionRes struct {
	User SessionUser `json:"user" dc:"已认证用户资料"`
}

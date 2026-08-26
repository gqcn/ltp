// 本文件定义创建服务端会话的登录接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// LoginReq 使用用户名和密码创建服务端会话。
type LoginReq struct {
	g.Meta   `path:"/auth/sessions" method:"post" tags:"Authentication" summary:"登录" dc:"使用用户名和密码认证本地平台管理员，创建服务端会话并设置 HttpOnly 会话 Cookie。"`
	Username string `json:"username" v:"required" dc:"登录用户名" eg:"admin"`
	Password string `json:"password" v:"required" dc:"登录密码" eg:"admin123"`
}

// LoginRes 在登录成功后返回已认证用户。
type LoginRes struct {
	User SessionUser `json:"user" dc:"已认证用户资料"`
}

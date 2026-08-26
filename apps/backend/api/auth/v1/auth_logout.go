// 本文件定义撤销当前会话的退出接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// LogoutReq 撤销当前服务端会话。
type LogoutReq struct {
	g.Meta `path:"/auth/session" method:"delete" tags:"Authentication" summary:"退出登录" dc:"撤销当前服务端会话并使浏览器会话 Cookie 过期。重复退出幂等。"`
}

// LogoutRes 告知客户端应按已退出处理会话。
type LogoutRes struct {
	LoggedOut bool `json:"loggedOut" dc:"退出处理后恒为 true" eg:"true"`
}

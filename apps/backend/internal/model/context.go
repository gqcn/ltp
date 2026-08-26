// 本文件定义中间件保存的请求级业务上下文。

package model

// Context 是中间件注入的请求级身份快照。
type Context struct {
	UserID   int64
	Username string
	Nickname string
	IsAdmin  bool
	Source   string
	RoleCode string
	Menus    []string
}

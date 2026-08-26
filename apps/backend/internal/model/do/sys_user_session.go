// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUserSession is the golang structure of table sys_user_session for DAO operations like Where/Data.
type SysUserSession struct {
	g.Meta    `orm:"table:sys_user_session, do:true"`
	Id        any         // 会话 ID
	UserId    any         // 用户 ID
	TokenHash any         // 不透明会话令牌的 SHA-256 十六进制值
	UserAgent any         // 登录时的 User-Agent
	IpAddress any         // 登录时的客户端 IP
	ExpiresAt *gtime.Time // 会话过期时间
	RevokedAt *gtime.Time // 撤销时间
	CreatedAt *gtime.Time // 创建时间
	UpdatedAt *gtime.Time // 更新时间
}

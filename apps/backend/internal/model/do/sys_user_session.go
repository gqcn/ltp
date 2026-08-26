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
	Id        any         // Session ID
	UserId    any         // User ID
	TokenHash any         // SHA-256 hex of the opaque session token
	UserAgent any         // User agent at login
	IpAddress any         // Client IP at login
	ExpiresAt *gtime.Time // Session expiration time
	RevokedAt *gtime.Time // Revocation time
	CreatedAt *gtime.Time // Creation time
	UpdatedAt *gtime.Time // Update time
}

// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUserSession is the golang structure for table sys_user_session.
type SysUserSession struct {
	Id        int64       `json:"id"        orm:"id"         description:"会话 ID"`
	UserId    int64       `json:"userId"    orm:"user_id"    description:"用户 ID"`
	TokenHash string      `json:"tokenHash" orm:"token_hash" description:"不透明会话令牌的 SHA-256 十六进制值"`
	UserAgent string      `json:"userAgent" orm:"user_agent" description:"登录时的 User-Agent"`
	IpAddress string      `json:"ipAddress" orm:"ip_address" description:"登录时的客户端 IP"`
	ExpiresAt *gtime.Time `json:"expiresAt" orm:"expires_at" description:"会话过期时间"`
	RevokedAt *gtime.Time `json:"revokedAt" orm:"revoked_at" description:"撤销时间"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"创建时间"`
	UpdatedAt *gtime.Time `json:"updatedAt" orm:"updated_at" description:"更新时间"`
}

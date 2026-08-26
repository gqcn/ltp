// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUserSession is the golang structure for table sys_user_session.
type SysUserSession struct {
	Id        int64       `json:"id"        orm:"id"         description:"Session ID"`
	UserId    int64       `json:"userId"    orm:"user_id"    description:"User ID"`
	TokenHash string      `json:"tokenHash" orm:"token_hash" description:"SHA-256 hex of the opaque session token"`
	UserAgent string      `json:"userAgent" orm:"user_agent" description:"User agent at login"`
	IpAddress string      `json:"ipAddress" orm:"ip_address" description:"Client IP at login"`
	ExpiresAt *gtime.Time `json:"expiresAt" orm:"expires_at" description:"Session expiration time"`
	RevokedAt *gtime.Time `json:"revokedAt" orm:"revoked_at" description:"Revocation time"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"Creation time"`
	UpdatedAt *gtime.Time `json:"updatedAt" orm:"updated_at" description:"Update time"`
}

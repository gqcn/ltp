// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysUser is the golang structure for table sys_user.
type SysUser struct {
	Id        int64       `json:"id"        orm:"id"         description:"User ID"`
	Username  string      `json:"username"  orm:"username"   description:"Login username"`
	Password  string      `json:"password"  orm:"password"   description:"Password hash"`
	Nickname  string      `json:"nickname"  orm:"nickname"   description:"Display name"`
	Status    int         `json:"status"    orm:"status"     description:"Status: 1=enabled 0=disabled"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"Creation time"`
	UpdatedAt *gtime.Time `json:"updatedAt" orm:"updated_at" description:"Update time"`
	DeletedAt *gtime.Time `json:"deletedAt" orm:"deleted_at" description:"Deletion time"`
}

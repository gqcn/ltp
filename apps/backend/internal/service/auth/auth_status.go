// 本文件定义具名用户状态值。禁止硬编码状态整数。

package auth

// UserStatus 是 sys_user.status 上的账号启用标记。
type UserStatus int

const (
	// UserStatusDisabled 表示账号不可登录。
	UserStatusDisabled UserStatus = 0
	// UserStatusEnabled 表示账号可以登录。
	UserStatusEnabled UserStatus = 1
)

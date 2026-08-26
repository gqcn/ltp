// 本文件定义账号来源与登录方式的命名类型。禁止硬编码来源字符串。

package auth

import "strings"

// UserSource 是 sys_user.source 上的账号来源。
type UserSource string

const (
	// UserSourceLocal 表示本地平台管理员。
	UserSourceLocal UserSource = "local"
	// UserSourceLDAP 表示从目录加入的平台用户。
	UserSourceLDAP UserSource = "ldap"
)

// LoginMode 是登录请求中的入口方式。
type LoginMode string

const (
	// LoginModeAdmin 表示平台管理员入口。
	LoginModeAdmin LoginMode = "admin"
	// LoginModeLDAP 表示 LDAP 用户入口。
	LoginModeLDAP LoginMode = "ldap"
)

// ParseLoginMode 解析登录方式。
func ParseLoginMode(raw string) (LoginMode, bool) {
	switch LoginMode(strings.TrimSpace(raw)) {
	case LoginModeAdmin:
		return LoginModeAdmin, true
	case LoginModeLDAP:
		return LoginModeLDAP, true
	default:
		return "", false
	}
}

func parseUserSource(raw string) UserSource {
	switch UserSource(strings.TrimSpace(raw)) {
	case UserSourceLDAP:
		return UserSourceLDAP
	default:
		return UserSourceLocal
	}
}

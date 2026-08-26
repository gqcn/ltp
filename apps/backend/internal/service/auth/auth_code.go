// 本文件定义认证业务错误码。

package auth

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeUnauthorized 表示会话缺失、无效或已过期。
	CodeUnauthorized = bizerr.MustDefine(
		"AUTH_UNAUTHORIZED",
		"Not signed in",
		gcode.CodeNotAuthorized,
	)
	// CodeInvalidCredentials 表示用户名或密码错误。
	CodeInvalidCredentials = bizerr.MustDefine(
		"AUTH_INVALID_CREDENTIALS",
		"{message}",
		gcode.CodeNotAuthorized,
	)
	// CodeUserDisabled 表示账号存在但不可登录。
	CodeUserDisabled = bizerr.MustDefine(
		"AUTH_USER_DISABLED",
		"该账号已停用，无法登录，请联系管理员启用",
		gcode.CodeNotAuthorized,
	)
	// CodeNotPlatformUser 表示目录账号尚未加入平台可用用户列表。
	CodeNotPlatformUser = bizerr.MustDefine(
		"AUTH_NOT_PLATFORM_USER",
		"该账号不在平台可用用户列表中，请联系管理员从 LDAP 添加",
		gcode.CodeNotAuthorized,
	)
	// CodeForbidden 表示已登录但没有当前接口的菜单权限。
	CodeForbidden = bizerr.MustDefine(
		"AUTH_FORBIDDEN",
		"没有权限访问该资源",
		gcode.CodeNotAuthorized,
	)
)

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
		"Invalid username or password",
		gcode.CodeNotAuthorized,
	)
	// CodeUserDisabled 表示账号存在但不可登录。
	CodeUserDisabled = bizerr.MustDefine(
		"AUTH_USER_DISABLED",
		"User is disabled",
		gcode.CodeNotAuthorized,
	)
)

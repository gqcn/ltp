// 本文件定义平台用户业务错误码。

package user

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示用户不存在。
	CodeNotFound = bizerr.MustDefine(
		"USER_NOT_FOUND",
		"用户不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示参数校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"USER_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeCannotRemoveSelf 表示不能移除当前登录用户。
	CodeCannotRemoveSelf = bizerr.MustDefine(
		"USER_CANNOT_REMOVE_SELF",
		"不能移除当前登录用户",
		gcode.CodeValidationFailed,
	)
)

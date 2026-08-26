// 本文件定义角色业务错误码。

package role

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示角色不存在。
	CodeNotFound = bizerr.MustDefine(
		"ROLE_NOT_FOUND",
		"角色不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示名称校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"ROLE_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示角色名称重复。
	CodeNameExists = bizerr.MustDefine(
		"ROLE_NAME_EXISTS",
		"已存在同名角色",
		gcode.CodeInvalidParameter,
	)
)

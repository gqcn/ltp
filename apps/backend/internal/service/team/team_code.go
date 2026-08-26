// 本文件定义团队业务错误码。

package team

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示团队不存在。
	CodeNotFound = bizerr.MustDefine(
		"TEAM_NOT_FOUND",
		"团队不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示参数校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"TEAM_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示团队名称重复。
	CodeNameExists = bizerr.MustDefine(
		"TEAM_NAME_EXISTS",
		"团队名称已存在",
		gcode.CodeInvalidParameter,
	)
)

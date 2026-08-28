// 本文件定义配置集业务错误码。

package traincfg

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示配置集不存在或不可见。
	CodeNotFound = bizerr.MustDefine(
		"CONFIG_NOT_FOUND",
		"配置集不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"CONFIG_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示同团队显示名称重复。
	CodeNameExists = bizerr.MustDefine(
		"CONFIG_NAME_EXISTS",
		"同团队下显示名称已存在",
		gcode.CodeInvalidParameter,
	)
	// CodeConflict 表示发布时版本已变化。
	CodeConflict = bizerr.MustDefine(
		"CONFIG_VERSION_CONFLICT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

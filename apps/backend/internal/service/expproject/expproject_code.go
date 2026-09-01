// 本文件定义实验项目业务错误码。

package expproject

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示项目不存在。
	CodeNotFound = bizerr.MustDefine(
		"EXP_PROJECT_NOT_FOUND",
		"项目不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"EXP_PROJECT_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示未删除项目重名。
	CodeNameExists = bizerr.MustDefine(
		"EXP_PROJECT_NAME_EXISTS",
		"已存在同名项目，请换一个名称",
		gcode.CodeInvalidParameter,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

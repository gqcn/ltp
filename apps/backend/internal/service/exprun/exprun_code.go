// 本文件定义实验 Run 业务错误码。

package exprun

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示 Run 不存在或不可见。
	CodeNotFound = bizerr.MustDefine(
		"EXP_RUN_NOT_FOUND",
		"实验不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"EXP_RUN_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeBoardNotReady 表示看板尚未就绪。
	CodeBoardNotReady = bizerr.MustDefine(
		"EXP_BOARD_NOT_READY",
		"{message}",
		gcode.CodeOperationFailed,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

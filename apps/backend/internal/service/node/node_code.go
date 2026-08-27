// 本文件定义节点业务错误码。

package node

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"NODE_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNotFound 表示节点不存在。
	CodeNotFound = bizerr.MustDefine(
		"NODE_NOT_FOUND",
		"Node does not exist",
		gcode.CodeNotFound,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

// 本文件定义队列业务错误码。

package queue

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示队列不存在。
	CodeNotFound = bizerr.MustDefine(
		"QUEUE_NOT_FOUND",
		"Queue does not exist",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"QUEUE_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示同一集群下标识重复。
	CodeNameExists = bizerr.MustDefine(
		"QUEUE_NAME_EXISTS",
		"Queue name already exists in this cluster",
		gcode.CodeInvalidParameter,
	)
	// CodeBusy 表示仍有运行或排队占用。
	CodeBusy = bizerr.MustDefine(
		"QUEUE_BUSY",
		"Queue still has running or pending workloads",
		gcode.CodeInvalidParameter,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

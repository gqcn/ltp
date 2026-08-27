// 本文件定义告警业务错误码。

package alert

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示告警不存在。
	CodeNotFound = bizerr.MustDefine(
		"ALERT_NOT_FOUND",
		"Alert does not exist",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"ALERT_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeUnauthorized 表示 Webhook 令牌不匹配。
	CodeUnauthorized = bizerr.MustDefine(
		"ALERT_WEBHOOK_UNAUTHORIZED",
		"Webhook token mismatch",
		gcode.CodeNotAuthorized,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

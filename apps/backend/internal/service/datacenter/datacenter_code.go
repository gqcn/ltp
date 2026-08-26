// 本文件定义数据中心业务错误码。

package datacenter

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示数据中心不存在。
	CodeNotFound = bizerr.MustDefine(
		"DATACENTER_NOT_FOUND",
		"Datacenter does not exist",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"DATACENTER_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeCodeExists 表示业务标识重复。
	CodeCodeExists = bizerr.MustDefine(
		"DATACENTER_CODE_EXISTS",
		"Datacenter code already exists",
		gcode.CodeInvalidParameter,
	)
	// CodeDefaultProtected 表示非法改动默认数据中心。
	CodeDefaultProtected = bizerr.MustDefine(
		"DATACENTER_DEFAULT_PROTECTED",
		"{message}",
		gcode.CodeNotAuthorized,
	)
)

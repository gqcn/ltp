// 本文件定义 LDAP 业务错误码。

package ldap

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotConfigured 表示尚未保存可用的 LDAP 配置。
	CodeNotConfigured = bizerr.MustDefine(
		"LDAP_NOT_CONFIGURED",
		"LDAP 尚未配置",
		gcode.CodeInvalidParameter,
	)
	// CodeInvalidInput 表示配置校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"LDAP_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeConnectFailed 表示连接或绑定失败。
	CodeConnectFailed = bizerr.MustDefine(
		"LDAP_CONNECT_FAILED",
		"{message}",
		gcode.CodeInternalError,
	)
)

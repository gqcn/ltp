// 本文件定义集群业务错误码。

package cluster

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeNotFound 表示集群不存在。
	CodeNotFound = bizerr.MustDefine(
		"CLUSTER_NOT_FOUND",
		"Cluster does not exist",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"CLUSTER_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示显示名称重复。
	CodeNameExists = bizerr.MustDefine(
		"CLUSTER_NAME_EXISTS",
		"Cluster display name already exists",
		gcode.CodeInvalidParameter,
	)
	// CodeUnreachable 表示连通失败。
	CodeUnreachable = bizerr.MustDefine(
		"CLUSTER_UNREACHABLE",
		"{message}",
		gcode.CodeOperationFailed,
	)
)

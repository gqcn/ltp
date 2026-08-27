// 本文件定义 Kubernetes 访问业务错误码。

package kube

import (
	"github.com/gogf/gf/v2/errors/gcode"

	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	// CodeInvalidKubeconfig 表示凭证无法解析。
	CodeInvalidKubeconfig = bizerr.MustDefine(
		"KUBE_INVALID_KUBECONFIG",
		"Kubeconfig is invalid",
		gcode.CodeInvalidParameter,
	)
	// CodeUnreachable 表示集群不可达。
	CodeUnreachable = bizerr.MustDefine(
		"KUBE_UNREACHABLE",
		"{message}",
		gcode.CodeOperationFailed,
	)
	// CodeNodeNotFound 表示节点不存在。
	CodeNodeNotFound = bizerr.MustDefine(
		"KUBE_NODE_NOT_FOUND",
		"Node does not exist",
		gcode.CodeNotFound,
	)
	// CodeQueueNotFound 表示 Volcano Queue 不存在。
	CodeQueueNotFound = bizerr.MustDefine(
		"KUBE_QUEUE_NOT_FOUND",
		"Volcano queue does not exist",
		gcode.CodeNotFound,
	)
	// CodeJobNotFound 表示 Volcano Job 不存在。
	CodeJobNotFound = bizerr.MustDefine(
		"KUBE_JOB_NOT_FOUND",
		"Volcano job does not exist",
		gcode.CodeNotFound,
	)
	// CodeInvalidName 表示 Queue / Job 名称不符合 Kubernetes 或 Volcano 规范。
	CodeInvalidName = bizerr.MustDefine(
		"KUBE_INVALID_NAME",
		"{message}",
		gcode.CodeInvalidParameter,
	)
)

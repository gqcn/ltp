// 本文件定义训练任务业务错误码与状态常量。

package trainjob

import (
	"strings"

	"github.com/gogf/gf/v2/errors/gcode"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"

	"github.com/gqcn/ltp/pkg/bizerr"
)

const (
	statusQueued       = "queued"
	statusStarting     = "starting"
	statusRunning      = "running"
	statusSuccess      = "success"
	statusFailed       = "failed"
	statusCancelled    = "cancelled"
	priorityP0         = "P0"
	priorityP1         = "P1"
	priorityP2         = "P2"
	priorityP3         = "P3"
	featureIB          = "ib"
	configStatusActive = "active"
	configVisPrivate   = "private"
)

var (
	// CodeNotFound 表示任务不存在或不可见。
	CodeNotFound = bizerr.MustDefine(
		"JOB_NOT_FOUND",
		"训练任务不存在",
		gcode.CodeNotFound,
	)
	// CodeInvalidInput 表示校验失败。
	CodeInvalidInput = bizerr.MustDefine(
		"JOB_INVALID_INPUT",
		"{message}",
		gcode.CodeInvalidParameter,
	)
	// CodeNameExists 表示同集群任务名重复。
	CodeNameExists = bizerr.MustDefine(
		"JOB_NAME_EXISTS",
		"任务名称已存在",
		gcode.CodeInvalidParameter,
	)
	// CodeNotRunning 表示当前状态不可停止。
	CodeNotRunning = bizerr.MustDefine(
		"JOB_NOT_RUNNING",
		"只有运行中、启动中或排队中的任务可以停止",
		gcode.CodeInvalidParameter,
	)
)

func errInvalid(message string) error {
	return bizerr.New(CodeInvalidInput, bizerr.P("message", message))
}

func parsePriority(raw string) (string, bool) {
	switch strings.TrimSpace(raw) {
	case priorityP0, priorityP1, priorityP2, priorityP3:
		return strings.TrimSpace(raw), true
	default:
		return "", false
	}
}

func mapVolcanoPhase(phase string) string {
	switch batchv1alpha1.JobPhase(phase) {
	case batchv1alpha1.Pending:
		return statusQueued
	case batchv1alpha1.Restarting, batchv1alpha1.Completing:
		return statusStarting
	case batchv1alpha1.Running:
		return statusRunning
	case batchv1alpha1.Completed:
		return statusSuccess
	case batchv1alpha1.Failed:
		return statusFailed
	case batchv1alpha1.Aborting, batchv1alpha1.Aborted, batchv1alpha1.Terminating, batchv1alpha1.Terminated:
		return statusCancelled
	default:
		if phase == "" {
			return statusQueued
		}
		return statusQueued
	}
}

func isActiveStatus(status string) bool {
	switch status {
	case statusQueued, statusStarting, statusRunning:
		return true
	default:
		return false
	}
}

func listBucketOf(status string) int {
	if status == statusQueued {
		return 0
	}
	return 1
}

func priorityOrderOf(priority string) int {
	switch priority {
	case priorityP0:
		return 0
	case priorityP1:
		return 1
	case priorityP2:
		return 2
	default:
		return 3
	}
}

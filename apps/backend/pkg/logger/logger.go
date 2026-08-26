// Package logger 提供项目统一日志封装。本包以外的生产代码不得直接调用 g.Log()。
package logger

import (
	"context"
	"sync"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/glog"
)

var (
	logger   *glog.Logger
	initOnce sync.Once
)

// Logger 返回共享的应用日志器。
func Logger() *glog.Logger {
	initOnce.Do(func() {
		logger = g.Log()
		logger.SetStackSkip(1)
		logger.SetFlags(glog.F_TIME_STD | glog.F_FILE_SHORT)
	})
	return logger
}

// Info 按请求上下文打印 info 日志。
func Info(ctx context.Context, v ...interface{}) {
	Logger().Info(ctx, v...)
}

// Infof 按请求上下文打印格式化 info 日志。
func Infof(ctx context.Context, format string, v ...interface{}) {
	Logger().Infof(ctx, format, v...)
}

// Debug 按请求上下文打印 debug 日志。
func Debug(ctx context.Context, v ...interface{}) {
	Logger().Debug(ctx, v...)
}

// Debugf 按请求上下文打印格式化 debug 日志。
func Debugf(ctx context.Context, format string, v ...interface{}) {
	Logger().Debugf(ctx, format, v...)
}

// Warning 按请求上下文打印 warning 日志。
func Warning(ctx context.Context, v ...interface{}) {
	Logger().Warning(ctx, v...)
}

// Warningf 按请求上下文打印格式化 warning 日志。
func Warningf(ctx context.Context, format string, v ...interface{}) {
	Logger().Warningf(ctx, format, v...)
}

// Error 按请求上下文打印 error 日志。
func Error(ctx context.Context, v ...interface{}) {
	Logger().Error(ctx, v...)
}

// Errorf 按请求上下文打印格式化 error 日志。
func Errorf(ctx context.Context, format string, v ...interface{}) {
	Logger().Errorf(ctx, format, v...)
}

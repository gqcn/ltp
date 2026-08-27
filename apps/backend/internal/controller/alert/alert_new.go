// 本文件定义告警控制器构造函数与注入依赖。

package alert

import (
	"context"

	alertapi "github.com/gqcn/ltp/api/alert"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
	"github.com/gqcn/ltp/internal/service/bizctx"
)

// ControllerV1 是告警控制器。
type ControllerV1 struct {
	alertSvc  alertsvc.Service
	bizCtxSvc bizctx.Service
}

// NewV1 创建告警控制器。
func NewV1(alertSvc alertsvc.Service, bizCtxSvc bizctx.Service) alertapi.IAlertV1 {
	return &ControllerV1{alertSvc: alertSvc, bizCtxSvc: bizCtxSvc}
}

func (c *ControllerV1) operator(ctx context.Context) string {
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		if ident.Nickname != "" {
			return ident.Nickname
		}
		return ident.Username
	}
	return ""
}

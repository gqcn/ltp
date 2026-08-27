// 本文件定义 Webhook 控制器构造函数与注入依赖。

package webhook

import (
	webhookapi "github.com/gqcn/ltp/api/webhook"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

// ControllerV1 是 Webhook 控制器。
type ControllerV1 struct {
	alertSvc alertsvc.Service
}

// NewV1 创建 Webhook 控制器。
func NewV1(alertSvc alertsvc.Service) webhookapi.IWebhookV1 {
	return &ControllerV1{alertSvc: alertSvc}
}

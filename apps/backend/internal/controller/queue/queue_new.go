// 本文件定义队列控制器构造函数与注入依赖。

package queue

import (
	queueapi "github.com/gqcn/ltp/api/queue"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

// ControllerV1 是队列控制器。
type ControllerV1 struct {
	queueSvc queuesvc.Service
}

// NewV1 创建队列控制器。
func NewV1(queueSvc queuesvc.Service) queueapi.IQueueV1 {
	return &ControllerV1{queueSvc: queueSvc}
}

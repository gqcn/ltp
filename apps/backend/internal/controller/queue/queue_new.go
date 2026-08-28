// 本文件定义队列控制器构造函数与注入依赖。

package queue

import (
	queueapi "github.com/gqcn/ltp/api/queue"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
	trainjob "github.com/gqcn/ltp/internal/service/trainjob"
)

// ControllerV1 是队列控制器。
type ControllerV1 struct {
	queueSvc queuesvc.Service // 队列
	jobSvc   trainjob.Service // 可选，训练未装配时卡时为 0
}

// NewV1 创建队列控制器。jobSvc 允许为 nil，此时本月卡时返回 0。
func NewV1(queueSvc queuesvc.Service, jobSvc trainjob.Service) queueapi.IQueueV1 {
	return &ControllerV1{queueSvc: queueSvc, jobSvc: jobSvc}
}

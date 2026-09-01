// Package cron 统一注册与启动定时任务，业务逻辑仍在各业务服务中。
package cron

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gcron"

	"github.com/gqcn/ltp/internal/service/exprun"
	"github.com/gqcn/ltp/pkg/logger"
)

const experimentPattern = "0/30 * * * * *"

// Service 定义定时任务入口。
type Service interface {
	// Start 注册全部定时任务。可重复调用由 gcron 按名称去重。
	Start(ctx context.Context) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	runSvc exprun.Service // 实验对账
}

// New 构造定时任务组件。
func New(runSvc exprun.Service) (Service, error) {
	if runSvc == nil {
		return nil, gerror.New("experiment run service is required")
	}
	return &serviceImpl{runSvc: runSvc}, nil
}

// Start 注册实验代理对账任务。
func (s *serviceImpl) Start(ctx context.Context) error {
	_, err := gcron.AddSingleton(ctx, experimentPattern, func(ctx context.Context) {
		if recErr := s.runSvc.Reconcile(ctx); recErr != nil {
			logger.Warningf(ctx, "experiment reconcile: %v", recErr)
		}
	}, "experiment-reconcile")
	if err != nil {
		return gerror.Wrap(err, "register experiment reconcile cron")
	}
	return nil
}

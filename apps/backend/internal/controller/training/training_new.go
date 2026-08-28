// 本文件定义训练中心控制器构造函数与身份转换。

package training

import (
	"context"

	trainingapi "github.com/gqcn/ltp/api/training"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/bizctx"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
	traincfg "github.com/gqcn/ltp/internal/service/traincfg"
	trainjob "github.com/gqcn/ltp/internal/service/trainjob"
	usersvc "github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// ControllerV1 是训练中心控制器。
type ControllerV1 struct {
	jobSvc     trainjob.Service
	cfgSvc     traincfg.Service
	clusterSvc clustersvc.Service
	teamSvc    teamsvc.Service
	userSvc    usersvc.Service
	bizCtxSvc  bizctx.Service
}

// NewV1 创建训练中心控制器。
func NewV1(
	jobSvc trainjob.Service,
	cfgSvc traincfg.Service,
	clusterSvc clustersvc.Service,
	teamSvc teamsvc.Service,
	userSvc usersvc.Service,
	bizCtxSvc bizctx.Service,
) trainingapi.ITrainingV1 {
	return &ControllerV1{
		jobSvc:     jobSvc,
		cfgSvc:     cfgSvc,
		clusterSvc: clusterSvc,
		teamSvc:    teamSvc,
		userSvc:    userSvc,
		bizCtxSvc:  bizCtxSvc,
	}
}

func (c *ControllerV1) jobActor(ctx context.Context) (trainjob.Actor, error) {
	ident := c.bizCtxSvc.Get(ctx)
	if ident == nil || ident.UserID == 0 {
		return trainjob.Actor{}, bizerr.New(authsvc.CodeUnauthorized)
	}
	return trainjob.Actor{
		UserID:   ident.UserID,
		Username: ident.Username,
		Nickname: ident.Nickname,
		IsAdmin:  ident.IsAdmin,
	}, nil
}

func (c *ControllerV1) cfgActor(ctx context.Context) (traincfg.Actor, error) {
	ident := c.bizCtxSvc.Get(ctx)
	if ident == nil || ident.UserID == 0 {
		return traincfg.Actor{}, bizerr.New(authsvc.CodeUnauthorized)
	}
	return traincfg.Actor{
		UserID:   ident.UserID,
		Username: ident.Username,
		Nickname: ident.Nickname,
		IsAdmin:  ident.IsAdmin,
	}, nil
}

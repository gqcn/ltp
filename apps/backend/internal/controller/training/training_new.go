// 本文件定义训练中心控制器构造函数与身份转换。

package training

import (
	"context"

	trainingapi "github.com/gqcn/ltp/api/training"
	"github.com/gqcn/ltp/internal/model"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/bizctx"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/expproject"
	"github.com/gqcn/ltp/internal/service/exprun"
	"github.com/gqcn/ltp/internal/service/role"
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
	projectSvc expproject.Service
	runSvc     exprun.Service
	clusterSvc clustersvc.Service
	teamSvc    teamsvc.Service
	userSvc    usersvc.Service
	bizCtxSvc  bizctx.Service
}

// NewV1 创建训练中心控制器。
func NewV1(
	jobSvc trainjob.Service,
	cfgSvc traincfg.Service,
	projectSvc expproject.Service,
	runSvc exprun.Service,
	clusterSvc clustersvc.Service,
	teamSvc teamsvc.Service,
	userSvc usersvc.Service,
	bizCtxSvc bizctx.Service,
) trainingapi.ITrainingV1 {
	return NewController(jobSvc, cfgSvc, projectSvc, runSvc, clusterSvc, teamSvc, userSvc, bizCtxSvc)
}

// NewController 返回具体控制器，供看板反代绑定。
func NewController(
	jobSvc trainjob.Service,
	cfgSvc traincfg.Service,
	projectSvc expproject.Service,
	runSvc exprun.Service,
	clusterSvc clustersvc.Service,
	teamSvc teamsvc.Service,
	userSvc usersvc.Service,
	bizCtxSvc bizctx.Service,
) *ControllerV1 {
	return &ControllerV1{
		jobSvc:     jobSvc,
		cfgSvc:     cfgSvc,
		projectSvc: projectSvc,
		runSvc:     runSvc,
		clusterSvc: clusterSvc,
		teamSvc:    teamSvc,
		userSvc:    userSvc,
		bizCtxSvc:  bizCtxSvc,
	}
}

// expActor 从会话构造实验项目与 Run 的调用身份。
func (c *ControllerV1) expActor(ctx context.Context) (expproject.Actor, exprun.Actor, error) {
	ident := c.bizCtxSvc.Get(ctx)
	if ident == nil || ident.UserID == 0 {
		return expproject.Actor{}, exprun.Actor{}, bizerr.New(authsvc.CodeUnauthorized)
	}
	seeAll := seeAllTeams(ident)
	proj := expproject.Actor{UserID: ident.UserID, Username: ident.Username, Nickname: ident.Nickname, IsAdmin: ident.IsAdmin, SeeAll: seeAll}
	run := exprun.Actor{UserID: ident.UserID, Username: ident.Username, Nickname: ident.Nickname, IsAdmin: ident.IsAdmin, SeeAll: seeAll}
	return proj, run, nil
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
		SeeAll:   seeAllTeams(ident),
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
		SeeAll:   seeAllTeams(ident),
	}, nil
}

// seeAllTeams 判断当前身份是否可查看全部团队的训练数据。
func seeAllTeams(ident *model.Context) bool {
	return role.SeesAllTeamData(ident.IsAdmin, role.Code(ident.RoleCode))
}

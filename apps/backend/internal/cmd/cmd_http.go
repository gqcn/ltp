// 本文件在装配控制器与中间件后启动 HTTP 服务。

package cmd

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/net/goai"
	"github.com/gogf/gf/v2/os/gcmd"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/controller/alert"
	"github.com/gqcn/ltp/internal/controller/auth"
	"github.com/gqcn/ltp/internal/controller/cluster"
	"github.com/gqcn/ltp/internal/controller/datacenter"
	"github.com/gqcn/ltp/internal/controller/health"
	"github.com/gqcn/ltp/internal/controller/node"
	"github.com/gqcn/ltp/internal/controller/queue"
	"github.com/gqcn/ltp/internal/controller/role"
	"github.com/gqcn/ltp/internal/controller/system"
	"github.com/gqcn/ltp/internal/controller/team"
	"github.com/gqcn/ltp/internal/controller/training"
	"github.com/gqcn/ltp/internal/controller/user"
	"github.com/gqcn/ltp/internal/controller/webhook"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/bizctx"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
	cronsvc "github.com/gqcn/ltp/internal/service/cron"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
	expprojectsvc "github.com/gqcn/ltp/internal/service/expproject"
	exprunsvc "github.com/gqcn/ltp/internal/service/exprun"
	"github.com/gqcn/ltp/internal/service/kube"
	ldapsvc "github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/middleware"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
	rolesvc "github.com/gqcn/ltp/internal/service/role"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
	traincfgsvc "github.com/gqcn/ltp/internal/service/traincfg"
	trainjobsvc "github.com/gqcn/ltp/internal/service/trainjob"
	usersvc "github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/logger"
)

func httpFunc(ctx context.Context, _ *gcmd.Parser) error {
	sessionTTL := g.Cfg().MustGet(ctx, "auth.sessionTTL", "24h").Duration()
	if sessionTTL <= 0 {
		sessionTTL = 24 * time.Hour
	}
	cookieName := g.Cfg().MustGet(ctx, "auth.cookieName", consts.CookieNameDefault).String()
	if cookieName == "" {
		cookieName = consts.CookieNameDefault
	}
	webhookToken := g.Cfg().MustGet(ctx, "ops.fastx.webhookToken").String()

	var (
		bizCtxSvc   = bizctx.New()
		roleSvc     = rolesvc.New()
		ldapDir     = ldapsvc.NewGoLDAPDirectory()
		kubeFactory = kube.NewFactory()
		usageHub    = dcsvc.NewSwitchableUsage()
	)
	ldapSvc, err := ldapsvc.New(ldapDir)
	if err != nil {
		return err
	}
	authSvc, err := authsvc.New(authsvc.Config{SessionTTL: sessionTTL}, ldapSvc, roleSvc)
	if err != nil {
		return err
	}
	userSvc, err := usersvc.New(ldapSvc, roleSvc)
	if err != nil {
		return err
	}
	teamSvc, err := teamsvc.New(userSvc)
	if err != nil {
		return err
	}
	dcSvc, err := dcsvc.New(usageHub)
	if err != nil {
		return err
	}
	clusterSvc, err := clustersvc.New(kubeFactory)
	if err != nil {
		return err
	}
	queueSvc, err := queuesvc.New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		return err
	}
	nodeSvc, err := nodesvc.New(clusterSvc, dcSvc, queueSvc)
	if err != nil {
		return err
	}
	alertSvc, err := alertsvc.New(alertsvc.Config{WebhookToken: webhookToken})
	if err != nil {
		return err
	}
	cfgSvc, err := traincfgsvc.New(teamSvc)
	if err != nil {
		return err
	}
	jobSvc, err := trainjobsvc.New(clusterSvc, queueSvc, dcSvc, teamSvc, userSvc, cfgSvc, alertSvc)
	if err != nil {
		return err
	}
	projectSvc, err := expprojectsvc.New(teamSvc)
	if err != nil {
		return err
	}
	agentImage := g.Cfg().MustGet(ctx, "experiment.agentImage", consts.AgentImageDefault).String()
	if agentImage == "" {
		agentImage = consts.AgentImageDefault
	}
	idleAfter := g.Cfg().MustGet(ctx, "experiment.idleAfter", "20m").Duration()
	runSvc, err := exprunsvc.New(clusterSvc, teamSvc, projectSvc, jobSvc, exprunsvc.Config{AgentImage: agentImage, IdleAfter: idleAfter})
	if err != nil {
		return err
	}
	jobSvc.BindRunLinker(runSvc)
	cronSvc, err := cronsvc.New(runSvc)
	if err != nil {
		return err
	}
	if err := cronSvc.Start(ctx); err != nil {
		return err
	}
	usageHub.Replace(dcsvc.NewLiveUsage(clusterSvc, queueSvc))
	teamSvc.BindQueues(queueSvc)

	mwSvc, err := middleware.New(authSvc, bizCtxSvc, middleware.Config{CookieName: cookieName})
	if err != nil {
		return err
	}

	var (
		authCtrl     = auth.NewV1(authSvc, cookieName)
		dcCtrl       = datacenter.NewV1(dcSvc)
		healthCtrl   = health.NewV1()
		userCtrl     = user.NewV1(userSvc, bizCtxSvc)
		roleCtrl     = role.NewV1(roleSvc, bizCtxSvc)
		teamCtrl     = team.NewV1(teamSvc)
		systemCtrl   = system.NewV1(ldapSvc, userSvc, bizCtxSvc)
		clusterCtrl  = cluster.NewV1(clusterSvc)
		nodeCtrl     = node.NewV1(nodeSvc, bizCtxSvc)
		queueCtrl    = queue.NewV1(queueSvc, jobSvc)
		alertCtrl    = alert.NewV1(alertSvc, bizCtxSvc)
		trainingCtrl = training.NewController(jobSvc, cfgSvc, projectSvc, runSvc, clusterSvc, teamSvc, userSvc, bizCtxSvc)
		webhookCtrl  = webhook.NewV1(alertSvc)
		s            = g.Server()
	)
	s.Group("/api", func(group *ghttp.RouterGroup) {
		group.Middleware(mwSvc.CORS, mwSvc.Response, mwSvc.Ctx)
		group.Bind(healthCtrl, authCtrl, webhookCtrl)
		group.Group("/", func(protected *ghttp.RouterGroup) {
			protected.Middleware(mwSvc.Auth, mwSvc.Permission)
			protected.Bind(dcCtrl, userCtrl, roleCtrl, teamCtrl, systemCtrl, clusterCtrl, nodeCtrl, queueCtrl, alertCtrl, trainingCtrl)
			protected.GET("/training/experiments/{id}/board/", trainingCtrl.ProxyBoard)
			protected.GET("/training/experiments/{id}/board/*any", trainingCtrl.ProxyBoard)
			protected.HEAD("/training/experiments/{id}/board/*any", trainingCtrl.ProxyBoard)
		})
	})
	enhanceOpenAPIDoc(s)
	logger.Infof(ctx, "starting HTTP server")
	s.Run()
	return nil
}

func enhanceOpenAPIDoc(s *ghttp.Server) {
	openapi := s.GetOpenApi()
	if openapi == nil {
		return
	}
	openapi.Config.CommonResponse = middleware.HandlerResponse{}
	openapi.Config.CommonResponseDataField = `Data`
	openapi.Info = goai.Info{
		Title:       "LTP API",
		Description: "LLM Training Platform HTTP API",
	}
}

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
	"github.com/gqcn/ltp/internal/controller/auth"
	"github.com/gqcn/ltp/internal/controller/datacenter"
	"github.com/gqcn/ltp/internal/controller/health"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/bizctx"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/middleware"
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

	var (
		bizCtxSvc = bizctx.New()
	)
	authSvc, err := authsvc.New(authsvc.Config{SessionTTL: sessionTTL})
	if err != nil {
		return err
	}
	dcSvc, err := dcsvc.New(dcsvc.NewZeroUsageCounter())
	if err != nil {
		return err
	}
	mwSvc, err := middleware.New(authSvc, bizCtxSvc, middleware.Config{CookieName: cookieName})
	if err != nil {
		return err
	}

	var (
		authCtrl   = auth.NewV1(authSvc, cookieName)
		dcCtrl     = datacenter.NewV1(dcSvc)
		healthCtrl = health.NewV1()
		s          = g.Server()
	)
	s.Group("/api", func(group *ghttp.RouterGroup) {
		group.Middleware(mwSvc.CORS, mwSvc.Response, mwSvc.Ctx)
		group.Bind(healthCtrl, authCtrl)
		group.Group("/", func(protected *ghttp.RouterGroup) {
			protected.Middleware(mwSvc.Auth)
			protected.Bind(dcCtrl)
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

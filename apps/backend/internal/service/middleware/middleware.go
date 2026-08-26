// Package middleware 实现 HTTP CORS、统一 JSON 响应、请求上下文注入和会话鉴权。
package middleware

import (
	"net/http"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/net/ghttp"

	"github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/bizctx"
)

// HandlerResponse 是 Response 中间件写出的统一 JSON 信封。
type HandlerResponse struct {
	Code      int    `json:"code" dc:"错误码。0 表示成功。"`                 // 错误码，0 表示成功
	Message   string `json:"message" dc:"展示文案"`                     // 展示文案
	Data      any    `json:"data" dc:"处理结果"`                        // 处理结果
	ErrorCode string `json:"errorCode,omitempty" dc:"稳定的机器可读业务错误码"` // 机器可读错误码
}

// Config 是 HTTP 中间件的纯值配置。
type Config struct {
	CookieName string // 会话 Cookie 名称
}

// Service 定义安装在路由组上的 HTTP 中间件。
type Service interface {
	// Response 在处理函数返回后序列化统一 JSON 载荷。
	Response(r *ghttp.Request)
	// Ctx 向请求注入业务上下文。
	Ctx(r *ghttp.Request)
	// CORS 允许本地开发时浏览器跨域调用。
	CORS(r *ghttp.Request)
	// Auth 校验会话 Cookie 并注入当前用户。
	Auth(r *ghttp.Request)
	// Permission 按接口 permission 标签校验当前用户菜单分区。
	Permission(r *ghttp.Request)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	authSvc    auth.Service   // 认证服务
	bizCtxSvc  bizctx.Service // 请求上下文服务
	cookieName string         // 会话 Cookie 名称
}

// New 用显式运行期依赖构造 HTTP 中间件。
func New(authSvc auth.Service, bizCtxSvc bizctx.Service, config Config) (Service, error) {
	if authSvc == nil {
		return nil, gerror.New("auth service is required")
	}
	if bizCtxSvc == nil {
		return nil, gerror.New("bizctx service is required")
	}
	if config.CookieName == "" {
		return nil, gerror.New("session cookie name is required")
	}
	return &serviceImpl{
		authSvc:    authSvc,
		bizCtxSvc:  bizCtxSvc,
		cookieName: config.CookieName,
	}, nil
}

// CORS 允许跨域资源共享。
func (s *serviceImpl) CORS(r *ghttp.Request) {
	r.Response.CORSDefault()
	if r.Method == http.MethodOptions {
		return
	}
	r.Middleware.Next()
}

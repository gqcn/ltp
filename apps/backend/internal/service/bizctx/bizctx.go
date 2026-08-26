// Package bizctx 为 HTTP 处理与服务保存请求级身份。
package bizctx

import (
	"context"

	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/model"
)

// ContextKey 是请求上下文中业务上下文的键。
const ContextKey gctx.StrKey = "BizCtx"

// Service 定义 bizctx 契约。
type Service interface {
	// Init 向当前请求注入业务上下文对象。
	Init(r *ghttp.Request, customCtx *model.Context)
	// Get 读取业务上下文，不存在时返回 nil。
	Get(ctx context.Context) *model.Context
	// SetUser 保存已认证用户身份快照。
	SetUser(ctx context.Context, ident model.Context)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct{}

// New 创建业务上下文服务。
func New() Service {
	return &serviceImpl{}
}

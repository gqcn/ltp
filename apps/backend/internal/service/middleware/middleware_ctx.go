// 本文件注入请求级业务上下文。

package middleware

import (
	"github.com/gogf/gf/v2/net/ghttp"

	"github.com/gqcn/ltp/internal/model"
)

// Ctx 向当前请求注入业务上下文对象。
func (s *serviceImpl) Ctx(r *ghttp.Request) {
	s.bizCtxSvc.Init(r, &model.Context{})
	r.Middleware.Next()
}

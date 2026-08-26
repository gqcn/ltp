// 本文件实现请求级业务上下文存储。

package bizctx

import (
	"context"

	"github.com/gogf/gf/v2/net/ghttp"

	"github.com/gqcn/ltp/internal/model"
)

// Init 向当前请求注入业务上下文对象。
func (s *serviceImpl) Init(r *ghttp.Request, customCtx *model.Context) {
	r.SetCtxVar(ContextKey, customCtx)
}

// Get 读取业务上下文，不存在时返回 nil。
func (s *serviceImpl) Get(ctx context.Context) *model.Context {
	value := ctx.Value(ContextKey)
	if value == nil {
		return nil
	}
	localCtx, ok := value.(*model.Context)
	if !ok {
		return nil
	}
	return localCtx
}

// SetUser 保存已认证用户身份。
func (s *serviceImpl) SetUser(ctx context.Context, userID int64, username string, nickname string) {
	if c := s.Get(ctx); c != nil {
		c.UserID = userID
		c.Username = username
		c.Nickname = nickname
	}
}

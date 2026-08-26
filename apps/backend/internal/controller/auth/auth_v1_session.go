// 本文件读取当前已认证会话。

package auth

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"

	v1 "github.com/gqcn/ltp/api/auth/v1"
)

// Session 返回当前会话 Cookie 绑定的用户。
func (c *ControllerV1) Session(ctx context.Context, _ *v1.SessionReq) (res *v1.SessionRes, err error) {
	request := g.RequestFromCtx(ctx)
	if request == nil {
		return nil, gerror.New("request context is unavailable")
	}
	user, err := c.authSvc.CurrentSession(ctx, c.sessionCookie(request))
	if err != nil {
		return nil, err
	}
	return &v1.SessionRes{
		User: v1.SessionUser{
			Id:       user.ID,
			Username: user.Username,
			Nickname: user.Nickname,
		},
	}, nil
}

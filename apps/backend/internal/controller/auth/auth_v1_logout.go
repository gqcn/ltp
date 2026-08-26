// 本文件撤销当前会话并使浏览器 Cookie 过期。

package auth

import (
	"context"

	"github.com/gogf/gf/v2/frame/g"

	v1 "github.com/gqcn/ltp/api/auth/v1"
)

// Logout 撤销服务端会话并清除 Cookie。
func (c *ControllerV1) Logout(ctx context.Context, _ *v1.LogoutReq) (res *v1.LogoutRes, err error) {
	request := g.RequestFromCtx(ctx)
	if request != nil {
		if err := c.authSvc.Logout(ctx, c.sessionCookie(request)); err != nil {
			return nil, err
		}
		c.clearSessionCookie(request)
	}
	return &v1.LogoutRes{LoggedOut: true}, nil
}

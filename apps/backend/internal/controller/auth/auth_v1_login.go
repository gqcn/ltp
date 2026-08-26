// 本文件处理由用户名和密码创建会话。

package auth

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"

	v1 "github.com/gqcn/ltp/api/auth/v1"
)

// Login 创建浏览器会话并写入 Cookie。
func (c *ControllerV1) Login(ctx context.Context, req *v1.LoginReq) (res *v1.LoginRes, err error) {
	request := g.RequestFromCtx(ctx)
	if request == nil {
		return nil, gerror.New("request context is unavailable")
	}
	result, err := c.authSvc.Login(ctx, req.Username, req.Password, request.UserAgent(), request.GetClientIp())
	if err != nil {
		return nil, err
	}
	c.setSessionCookie(request, result.Token, result.ExpiresAt)
	return &v1.LoginRes{
		User: v1.SessionUser{
			Id:       result.User.ID,
			Username: result.User.Username,
			Nickname: result.User.Nickname,
		},
	}, nil
}

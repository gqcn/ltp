// 本文件校验会话 Cookie 并注入已认证用户。

package middleware

import (
	"github.com/gogf/gf/v2/net/ghttp"

	"github.com/gqcn/ltp/internal/model"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// Auth 校验会话 Cookie 并注入当前用户。
func (s *serviceImpl) Auth(r *ghttp.Request) {
	token := r.Cookie.Get(s.cookieName, "").String()
	user, err := s.authSvc.CurrentSession(r.Context(), token)
	if err != nil {
		if !bizerr.Is(err, authsvc.CodeUnauthorized) {
			r.SetError(err)
			return
		}
		r.SetError(bizerr.New(authsvc.CodeUnauthorized))
		return
	}
	s.bizCtxSvc.SetUser(r.Context(), model.Context{
		UserID:   user.ID,
		Username: user.Username,
		Nickname: user.Nickname,
		IsAdmin:  user.IsAdmin,
		Source:   string(user.Source),
		RoleCode: string(user.RoleCode),
		Menus:    append([]string{}, user.Menus...),
	})
	r.Middleware.Next()
}

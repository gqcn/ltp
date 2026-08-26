// 本文件集中处理认证控制器的 HttpOnly 会话 Cookie 读写。

package auth

import (
	"net/http"
	"time"

	"github.com/gogf/gf/v2/net/ghttp"
)

func (c *ControllerV1) sessionCookie(r *ghttp.Request) string {
	if r == nil {
		return ""
	}
	return r.Cookie.Get(c.cookieName, "").String()
}

func (c *ControllerV1) setSessionCookie(r *ghttp.Request, token string, expiresAt time.Time) {
	maxAge := time.Until(expiresAt)
	if maxAge <= 0 {
		maxAge = time.Second
	}
	r.Cookie.SetCookie(c.cookieName, token, "", "/", maxAge, ghttp.CookieOptions{
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func (c *ControllerV1) clearSessionCookie(r *ghttp.Request) {
	if r == nil {
		return
	}
	r.Cookie.SetCookie(c.cookieName, "", "", "/", -24*time.Hour, ghttp.CookieOptions{
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

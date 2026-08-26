// 本文件按接口 permission 标签校验当前用户菜单分区。

package middleware

import (
	"strings"

	"github.com/gogf/gf/v2/net/ghttp"

	authsvc "github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
)

const (
	permPrefixPlatform = "platform:"
	permPrefixOps      = "ops:"
	permPrefixTraining = "training:"
)

// Permission 读取 handler 的 permission 元数据并校验菜单分区。
func (s *serviceImpl) Permission(r *ghttp.Request) {
	perm := ""
	if handler := r.GetServeHandler(); handler != nil {
		perm = strings.TrimSpace(handler.GetMetaTag("permission"))
	}
	if perm == "" {
		r.Middleware.Next()
		return
	}
	ident := s.bizCtxSvc.Get(r.Context())
	if ident == nil || ident.UserID == 0 {
		r.SetError(bizerr.New(authsvc.CodeUnauthorized))
		return
	}
	if !allowPermission(ident.IsAdmin, ident.Menus, perm) {
		r.SetError(bizerr.New(authsvc.CodeForbidden))
		return
	}
	r.Middleware.Next()
}

func allowPermission(isAdmin bool, menus []string, perm string) bool {
	if isAdmin {
		return true
	}
	switch {
	case strings.HasPrefix(perm, permPrefixPlatform):
		return false
	case strings.HasPrefix(perm, permPrefixOps):
		return hasMenu(menus, string(role.MenuOps))
	case strings.HasPrefix(perm, permPrefixTraining):
		return hasMenu(menus, string(role.MenuTraining))
	default:
		return false
	}
}

func hasMenu(menus []string, want string) bool {
	for _, item := range menus {
		if item == want {
			return true
		}
	}
	return false
}

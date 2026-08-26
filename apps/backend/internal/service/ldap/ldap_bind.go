// 本文件实现登录时的用户绑定。

package ldap

import (
	"context"
	"strings"

	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// BindUser 使用当前保存的配置对指定账号执行用户绑定。
func (s *serviceImpl) BindUser(ctx context.Context, username string, password string) error {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请输入域账号和密码"))
	}
	cfg, err := s.runtimeConfig(ctx)
	if err != nil {
		return err
	}
	if err := s.directory.BindUser(ctx, cfg, username, password); err != nil {
		logger.Infof(ctx, "ldap bind failed for user %s", username)
		return err
	}
	return nil
}

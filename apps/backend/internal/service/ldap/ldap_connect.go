// 本文件实现 LDAP 连接测试。

package ldap

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/pkg/logger"
)

// TestConfig 使用表单参数探测连接，并记录测试结果。
func (s *serviceImpl) TestConfig(ctx context.Context, in SaveInput) (*ProbeResult, error) {
	cfg, err := parseSaveInput(in)
	if err != nil {
		return nil, err
	}
	row, err := s.mustConfig(ctx)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.BindPassword) == "" {
		cfg.BindPassword = row.BindPassword
	}
	var (
		result  = TestResultSuccess
		message string
	)
	if err := s.directory.Ping(ctx, cfg); err != nil {
		result = TestResultFail
		message = "连接失败：请检查主机 / Bind DN / 密码"
		logger.Infof(ctx, "ldap test failed: %v", err)
	} else {
		scheme := "LDAP"
		if cfg.UseTLS {
			scheme = "LDAPS"
		}
		message = "连接成功 · " + scheme + " " + cfg.Host
		logger.Infof(ctx, "ldap test succeeded host=%s port=%d", cfg.Host, cfg.Port)
	}
	if _, err := dao.SysLdapConfig.Ctx(ctx).Where(do.SysLdapConfig{Id: row.Id}).Data(do.SysLdapConfig{
		LastTestAt:      gtime.Now(),
		LastTestResult:  string(result),
		LastTestMessage: clipMessage(message, 512),
	}).Update(); err != nil {
		return nil, gerror.Wrap(err, "save ldap test result")
	}
	view, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &ProbeResult{OK: result == TestResultSuccess, Message: message, Config: view}, nil
}

func clipMessage(v string, limit int) string {
	if len(v) <= limit {
		return v
	}
	return v[:limit]
}

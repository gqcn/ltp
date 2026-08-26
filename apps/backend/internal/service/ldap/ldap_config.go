// 本文件实现 LDAP 配置读取与保存。

package ldap

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// GetConfig 返回当前平台 LDAP 配置。
func (s *serviceImpl) GetConfig(ctx context.Context) (*View, error) {
	row, err := s.mustConfig(ctx)
	if err != nil {
		return nil, err
	}
	return toView(row), nil
}

// SaveConfig 保存连接参数。
func (s *serviceImpl) SaveConfig(ctx context.Context, in SaveInput) (*View, error) {
	cfg, err := parseSaveInput(in)
	if err != nil {
		return nil, err
	}
	row, err := s.mustConfig(ctx)
	if err != nil {
		return nil, err
	}
	password := cfg.BindPassword
	if strings.TrimSpace(in.BindPassword) == "" {
		password = row.BindPassword
	}
	if _, err := dao.SysLdapConfig.Ctx(ctx).Where(do.SysLdapConfig{Id: row.Id}).Data(do.SysLdapConfig{
		Name:           cfg.Name,
		Host:           cfg.Host,
		Port:           cfg.Port,
		UseTls:         cfg.UseTLS,
		BaseDn:         cfg.BaseDN,
		BindDn:         cfg.BindDN,
		BindPassword:   password,
		UserFilter:     cfg.UserFilter,
		SearchFilter:   cfg.SearchFilter,
		AttrUsername:   cfg.AttrUsername,
		AttrName:       cfg.AttrName,
		AttrEmail:      cfg.AttrEmail,
		AttrDepartment: cfg.AttrDepartment,
		AttrTitle:      cfg.AttrTitle,
		TimeoutSec:     cfg.TimeoutSec,
		UpdatedBy:      strings.TrimSpace(in.UpdatedBy),
	}).Update(); err != nil {
		return nil, gerror.Wrap(err, "save ldap config")
	}
	logger.Infof(ctx, "ldap config saved by %s", strings.TrimSpace(in.UpdatedBy))
	return s.GetConfig(ctx)
}

func (s *serviceImpl) mustConfig(ctx context.Context) (*entity.SysLdapConfig, error) {
	var row *entity.SysLdapConfig
	err := dao.SysLdapConfig.Ctx(ctx).Where(do.SysLdapConfig{Code: configCodeDefault}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "load ldap config")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotConfigured)
	}
	return row, nil
}

func (s *serviceImpl) runtimeConfig(ctx context.Context) (Config, error) {
	row, err := s.mustConfig(ctx)
	if err != nil {
		return Config{}, err
	}
	return configFromRow(row), nil
}

func parseSaveInput(in SaveInput) (Config, error) {
	cfg := Config{
		Name:           strings.TrimSpace(in.Name),
		Host:           strings.TrimSpace(in.Host),
		Port:           in.Port,
		UseTLS:         in.UseTLS,
		BaseDN:         strings.TrimSpace(in.BaseDN),
		BindDN:         strings.TrimSpace(in.BindDN),
		BindPassword:   in.BindPassword,
		UserFilter:     strings.TrimSpace(in.UserFilter),
		SearchFilter:   strings.TrimSpace(in.SearchFilter),
		AttrUsername:   strings.TrimSpace(in.AttrUsername),
		AttrName:       strings.TrimSpace(in.AttrName),
		AttrEmail:      strings.TrimSpace(in.AttrEmail),
		AttrDepartment: strings.TrimSpace(in.AttrDepartment),
		AttrTitle:      strings.TrimSpace(in.AttrTitle),
		TimeoutSec:     in.TimeoutSec,
	}.normalized()
	if cfg.Host == "" || cfg.Port < 1 || cfg.Port > 65535 || cfg.BaseDN == "" || cfg.BindDN == "" {
		return Config{}, bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写主机、端口、Base DN、Bind DN"))
	}
	return cfg, nil
}

func configFromRow(row *entity.SysLdapConfig) Config {
	if row == nil {
		return Config{}
	}
	return Config{
		Name:           row.Name,
		Host:           row.Host,
		Port:           row.Port,
		UseTLS:         row.UseTls,
		BaseDN:         row.BaseDn,
		BindDN:         row.BindDn,
		BindPassword:   row.BindPassword,
		UserFilter:     row.UserFilter,
		SearchFilter:   row.SearchFilter,
		AttrUsername:   row.AttrUsername,
		AttrName:       row.AttrName,
		AttrEmail:      row.AttrEmail,
		AttrDepartment: row.AttrDepartment,
		AttrTitle:      row.AttrTitle,
		TimeoutSec:     row.TimeoutSec,
	}.normalized()
}

func toView(row *entity.SysLdapConfig) *View {
	if row == nil {
		return nil
	}
	return &View{
		Name:            row.Name,
		Host:            row.Host,
		Port:            row.Port,
		UseTLS:          row.UseTls,
		BaseDN:          row.BaseDn,
		BindDN:          row.BindDn,
		BindPasswordSet: strings.TrimSpace(row.BindPassword) != "",
		UserFilter:      row.UserFilter,
		SearchFilter:    row.SearchFilter,
		AttrUsername:    row.AttrUsername,
		AttrName:        row.AttrName,
		AttrEmail:       row.AttrEmail,
		AttrDepartment:  row.AttrDepartment,
		AttrTitle:       row.AttrTitle,
		TimeoutSec:      row.TimeoutSec,
		LastTestAt:      model.UnixMilli(row.LastTestAt),
		LastTestResult:  TestResult(row.LastTestResult),
		LastTestMessage: row.LastTestMessage,
		UpdatedBy:       row.UpdatedBy,
		UpdatedAt:       model.UnixMilli(row.UpdatedAt),
	}
}

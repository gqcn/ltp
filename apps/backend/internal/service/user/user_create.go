// 本文件实现从 LDAP 目录批量加入平台用户。

package user

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// AddFromDirectory 按账号从 LDAP 批量加入平台用户。
func (s *serviceImpl) AddFromDirectory(ctx context.Context, usernames []string, roleCode role.Code) (int, error) {
	if _, ok := role.ParseCode(string(roleCode)); !ok {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请选择有效的角色权限"))
	}
	if _, err := s.roleSvc.GetByCode(ctx, roleCode); err != nil {
		return 0, err
	}
	wanted := uniqueLower(usernames)
	if len(wanted) == 0 {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请至少勾选一名 LDAP 用户"))
	}
	if len(wanted) > maxBatchIDs {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "单次最多添加 100 个用户"))
	}
	entries, err := s.ldapSvc.Lookup(ctx, wanted)
	if err != nil {
		return 0, err
	}
	byName := make(map[string]ldap.Entry, len(entries))
	for _, item := range entries {
		if item.Username == "" {
			continue
		}
		byName[strings.ToLower(item.Username)] = item
	}
	existing, err := s.ExistingUsernames(ctx, wanted)
	if err != nil {
		return 0, err
	}
	added := 0
	for _, name := range wanted {
		if existing[name] {
			continue
		}
		entry, ok := byName[name]
		if !ok {
			continue
		}
		nickname := strings.TrimSpace(entry.Name)
		if nickname == "" {
			nickname = entry.Username
		}
		if _, err := dao.SysUser.Ctx(ctx).Data(do.SysUser{
			Username:   entry.Username,
			Password:   "",
			Nickname:   nickname,
			Email:      entry.Email,
			Department: entry.Department,
			Title:      entry.Title,
			RoleCode:   string(roleCode),
			Source:     string(auth.UserSourceLDAP),
			Status:     int(auth.UserStatusEnabled),
		}).Insert(); err != nil {
			return added, gerror.Wrap(err, "insert platform user")
		}
		added++
	}
	logger.Infof(ctx, "added %d platform users with role %s", added, roleCode)
	return added, nil
}

func uniqueLower(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, raw := range values {
		name := strings.ToLower(strings.TrimSpace(raw))
		if i := strings.Index(name, "@"); i > 0 {
			name = name[:i]
		}
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out
}

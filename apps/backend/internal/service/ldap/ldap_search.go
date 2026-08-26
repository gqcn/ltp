// 本文件实现目录检索与批量账号查找。

package ldap

import (
	"context"
	"strings"

	ldaplib "github.com/go-ldap/ldap/v3"

	"github.com/gqcn/ltp/pkg/bizerr"
)

// SearchDirectory 按关键词检索目录用户。
func (s *serviceImpl) SearchDirectory(ctx context.Context, keyword string) ([]Entry, error) {
	cfg, err := s.runtimeConfig(ctx)
	if err != nil {
		return nil, err
	}
	filter := applyFilter(cfg.SearchFilter, filterQueryToken, strings.TrimSpace(keyword))
	entries, err := s.directory.Search(ctx, cfg, filter, maxDirectorySize)
	if err != nil {
		return nil, bizerr.Wrap(err, CodeConnectFailed, bizerr.P("message", "LDAP 目录检索失败，请检查配置"))
	}
	out := make([]Entry, 0, len(entries))
	for _, item := range entries {
		if strings.TrimSpace(item.Username) == "" {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

// Lookup 按账号批量查找目录用户。
func (s *serviceImpl) Lookup(ctx context.Context, usernames []string) ([]Entry, error) {
	cfg, err := s.runtimeConfig(ctx)
	if err != nil {
		return nil, err
	}
	wanted := uniqueUsernames(usernames)
	if len(wanted) == 0 {
		return nil, nil
	}
	if len(wanted) > maxLookupSize {
		return nil, bizerr.New(CodeInvalidInput, bizerr.P("message", "单次最多查找 100 个账号"))
	}
	parts := make([]string, 0, len(wanted))
	for _, name := range wanted {
		parts = append(parts, "("+cfg.AttrUsername+"="+ldaplib.EscapeFilter(name)+")")
	}
	filter := "(|" + strings.Join(parts, "") + ")"
	entries, err := s.directory.Search(ctx, cfg, filter, maxLookupSize)
	if err != nil {
		return nil, bizerr.Wrap(err, CodeConnectFailed, bizerr.P("message", "LDAP 目录检索失败，请检查配置"))
	}
	return entries, nil
}

func uniqueUsernames(usernames []string) []string {
	seen := make(map[string]struct{}, len(usernames))
	out := make([]string, 0, len(usernames))
	for _, raw := range usernames {
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

// 本文件实现基于 go-ldap 的真实目录访问。

package ldap

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"

	ldaplib "github.com/go-ldap/ldap/v3"
	"github.com/gogf/gf/v2/errors/gerror"
)

// NewGoLDAPDirectory 构造生产用目录客户端。
func NewGoLDAPDirectory() Directory {
	return goDirectory{}
}

type goDirectory struct{}

// Ping 绑定服务账号并检索 Base DN。
func (goDirectory) Ping(ctx context.Context, cfg Config) error {
	cfg = cfg.normalized()
	conn, err := dialLDAP(cfg)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return gerror.Wrap(err, "bind ldap service account")
	}
	req := ldaplib.NewSearchRequest(
		cfg.BaseDN,
		ldaplib.ScopeBaseObject,
		ldaplib.NeverDerefAliases,
		1,
		int(cfg.timeout().Seconds()),
		false,
		"(objectClass=*)",
		[]string{"dc", "o", "objectClass"},
		nil,
	)
	if _, err := conn.Search(req); err != nil {
		return gerror.Wrap(err, "search ldap base dn")
	}
	return ctx.Err()
}

// BindUser 以服务账号查找用户 DN，再使用用户密码绑定。
func (goDirectory) BindUser(ctx context.Context, cfg Config, username string, password string) error {
	cfg = cfg.normalized()
	conn, err := dialLDAP(cfg)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return gerror.Wrap(err, "bind ldap service account")
	}
	filter := applyFilter(cfg.UserFilter, filterUsernameToken, username)
	entries, err := searchEntries(conn, cfg, filter, 2)
	if err != nil {
		return err
	}
	if len(entries) != 1 || entries[0].DN == "" {
		return gerror.New("ldap user not found")
	}
	if err := conn.Bind(entries[0].DN, password); err != nil {
		return gerror.Wrap(err, "bind ldap user")
	}
	return ctx.Err()
}

// Search 使用服务账号执行过滤检索。
func (goDirectory) Search(ctx context.Context, cfg Config, filter string, limit int) ([]Entry, error) {
	cfg = cfg.normalized()
	conn, err := dialLDAP(cfg)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return nil, gerror.Wrap(err, "bind ldap service account")
	}
	entries, err := searchEntries(conn, cfg, filter, limit)
	if err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return entries, nil
}

func dialLDAP(cfg Config) (*ldaplib.Conn, error) {
	scheme := "ldap"
	if cfg.UseTLS {
		scheme = "ldaps"
	}
	addr := fmt.Sprintf("%s://%s:%d", scheme, cfg.Host, cfg.Port)
	dialer := &net.Dialer{Timeout: cfg.timeout()}
	var opts []ldaplib.DialOpt
	opts = append(opts, ldaplib.DialWithDialer(dialer))
	if cfg.UseTLS {
		opts = append(opts, ldaplib.DialWithTLSConfig(&tls.Config{MinVersion: tls.VersionTLS12, ServerName: cfg.Host}))
	}
	conn, err := ldaplib.DialURL(addr, opts...)
	if err != nil {
		return nil, gerror.Wrap(err, "dial ldap")
	}
	conn.SetTimeout(cfg.timeout())
	return conn, nil
}

func searchEntries(conn *ldaplib.Conn, cfg Config, filter string, limit int) ([]Entry, error) {
	if limit < 1 {
		limit = maxDirectorySize
	}
	attrs := []string{cfg.AttrUsername, cfg.AttrName, cfg.AttrEmail, cfg.AttrDepartment, cfg.AttrTitle}
	req := ldaplib.NewSearchRequest(
		cfg.BaseDN,
		ldaplib.ScopeWholeSubtree,
		ldaplib.NeverDerefAliases,
		limit,
		int(cfg.timeout().Seconds()),
		false,
		filter,
		attrs,
		nil,
	)
	res, err := conn.Search(req)
	if err != nil {
		return nil, gerror.Wrap(err, "search ldap")
	}
	out := make([]Entry, 0, len(res.Entries))
	for _, item := range res.Entries {
		if item == nil {
			continue
		}
		out = append(out, Entry{
			DN:         item.DN,
			Username:   item.GetAttributeValue(cfg.AttrUsername),
			Name:       item.GetAttributeValue(cfg.AttrName),
			Email:      item.GetAttributeValue(cfg.AttrEmail),
			Department: item.GetAttributeValue(cfg.AttrDepartment),
			Title:      item.GetAttributeValue(cfg.AttrTitle),
		})
	}
	return out, nil
}

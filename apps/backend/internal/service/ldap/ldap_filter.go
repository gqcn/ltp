// 本文件处理 LDAP 过滤器占位符替换与转义。

package ldap

import (
	"strings"

	ldaplib "github.com/go-ldap/ldap/v3"
)

func applyFilter(template string, token string, value string) string {
	if template == "" {
		return ""
	}
	return strings.ReplaceAll(template, token, ldaplib.EscapeFilter(value))
}

func (c Config) normalized() Config {
	out := c
	if out.UserFilter == "" {
		out.UserFilter = defaultUserFilter
	}
	if out.SearchFilter == "" {
		out.SearchFilter = defaultSearchFilter
	}
	if out.AttrUsername == "" {
		out.AttrUsername = defaultAttrUsername
	}
	if out.AttrName == "" {
		out.AttrName = defaultAttrName
	}
	if out.AttrEmail == "" {
		out.AttrEmail = defaultAttrEmail
	}
	if out.AttrDepartment == "" {
		out.AttrDepartment = defaultAttrDepartment
	}
	if out.AttrTitle == "" {
		out.AttrTitle = defaultAttrTitle
	}
	if out.TimeoutSec < 1 {
		out.TimeoutSec = defaultTimeoutSec
	}
	if out.TimeoutSec > maxTimeoutSec {
		out.TimeoutSec = maxTimeoutSec
	}
	return out
}

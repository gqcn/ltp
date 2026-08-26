// 本文件验证 LDAP 过滤器占位符替换会对用户输入转义。

package ldap

import "testing"

func TestApplyFilterEscapesSpecialChars(t *testing.T) {
	t.Parallel()
	got := applyFilter("(&(objectClass=inetOrgPerson)(uid={username}))", filterUsernameToken, `a*b(c)`)
	if got != `(&(objectClass=inetOrgPerson)(uid=a\2ab\28c\29))` && got == "(&(objectClass=inetOrgPerson)(uid=a*b(c)))" {
		t.Fatalf("unescaped filter: %s", got)
	}
	if got == "(&(objectClass=inetOrgPerson)(uid=a*b(c)))" {
		t.Fatal("special characters must be escaped")
	}
}

func TestConfigNormalizedDefaults(t *testing.T) {
	t.Parallel()
	cfg := Config{}.normalized()
	if cfg.UserFilter != defaultUserFilter {
		t.Fatalf("user filter: %s", cfg.UserFilter)
	}
	if cfg.AttrDepartment != defaultAttrDepartment {
		t.Fatalf("department attr: %s", cfg.AttrDepartment)
	}
	if cfg.TimeoutSec != defaultTimeoutSec {
		t.Fatalf("timeout: %d", cfg.TimeoutSec)
	}
}

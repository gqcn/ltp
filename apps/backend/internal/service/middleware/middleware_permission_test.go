// 本文件验证权限前缀与菜单分区的匹配关系。

package middleware

import (
	"testing"

	"github.com/gqcn/ltp/internal/service/role"
)

func TestAllowPermission(t *testing.T) {
	t.Parallel()
	ops := []string{string(role.MenuTraining), string(role.MenuOps)}
	algo := []string{string(role.MenuTraining)}
	cases := []struct {
		name    string
		admin   bool
		menus   []string
		perm    string
		allowed bool
	}{
		{name: "admin platform", admin: true, perm: "platform:user:query", allowed: true},
		{name: "sre datacenter", menus: ops, perm: "ops:datacenter:query", allowed: true},
		{name: "sre platform denied", menus: ops, perm: "platform:user:query", allowed: false},
		{name: "algo datacenter denied", menus: algo, perm: "ops:datacenter:query", allowed: false},
		{name: "empty permission skipped by middleware", perm: "", allowed: false},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := allowPermission(tc.admin, tc.menus, tc.perm); got != tc.allowed {
				t.Fatalf("got %v want %v", got, tc.allowed)
			}
		})
	}
}

// 本文件验证管理员与 LDAP 登录分流。

package auth

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type stubLDAP struct {
	bindErr error // BindUser 返回错误
}

func (s stubLDAP) GetConfig(context.Context) (*ldap.View, error) { return &ldap.View{}, nil }
func (s stubLDAP) SaveConfig(context.Context, ldap.SaveInput) (*ldap.View, error) {
	return &ldap.View{}, nil
}
func (s stubLDAP) TestConfig(context.Context, ldap.SaveInput) (*ldap.ProbeResult, error) {
	return &ldap.ProbeResult{OK: true}, nil
}
func (s stubLDAP) SearchDirectory(context.Context, string) ([]ldap.Entry, error) { return nil, nil }
func (s stubLDAP) Lookup(context.Context, []string) ([]ldap.Entry, error)        { return nil, nil }
func (s stubLDAP) BindUser(context.Context, string, string) error                { return s.bindErr }

func TestAdminLoginSuccess(t *testing.T) {
	svc := newAuthForTest(t)
	out, err := svc.Login(gctx.New(), LoginInput{Mode: LoginModeAdmin, Username: "admin", Password: "admin123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	t.Cleanup(func() { _ = svc.Logout(context.Background(), out.Token) })
	if !out.User.IsAdmin || out.User.Username != "admin" {
		t.Fatalf("unexpected user: %+v", out.User)
	}
	if len(out.User.Menus) == 0 {
		t.Fatal("admin should have menus")
	}
}

func TestLDAPLoginRequiresPlatformUser(t *testing.T) {
	svc := newAuthForTest(t)
	_, err := svc.Login(gctx.New(), LoginInput{Mode: LoginModeLDAP, Username: "not-in-platform", Password: "x"})
	if !bizerr.Is(err, CodeNotPlatformUser) {
		t.Fatalf("expected not platform user, got %v", err)
	}
}

func TestLDAPLoginBindFailure(t *testing.T) {
	svc := newAuthForTest(t)
	svc.(*serviceImpl).ldapSvc = stubLDAP{bindErr: bizerr.New(CodeInvalidCredentials, bizerr.P("message", "bind"))}
	_, err := svc.Login(gctx.New(), LoginInput{Mode: LoginModeLDAP, Username: "algo", Password: "wrong"})
	if !bizerr.Is(err, CodeInvalidCredentials) {
		t.Fatalf("expected invalid credentials, got %v", err)
	}
}

func TestLDAPLoginSuccess(t *testing.T) {
	svc := newAuthForTest(t)
	out, err := svc.Login(gctx.New(), LoginInput{Mode: LoginModeLDAP, Username: "algo", Password: "algo123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	t.Cleanup(func() { _ = svc.Logout(context.Background(), out.Token) })
	if out.User.IsAdmin || out.User.Username != "algo" || out.User.RoleCode != role.CodeAlgo {
		t.Fatalf("unexpected user: %+v", out.User)
	}
}

func newAuthForTest(t *testing.T) Service {
	t.Helper()
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	if err := g.DB().PingMaster(); err != nil {
		t.Skipf("postgres unavailable: %v", err)
	}
	_ = ctx
	svc, err := New(Config{SessionTTL: time.Hour}, stubLDAP{}, role.New())
	if err != nil {
		t.Fatal(err)
	}
	return svc
}

func findRepoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("repository root not found")
		}
		dir = parent
	}
}

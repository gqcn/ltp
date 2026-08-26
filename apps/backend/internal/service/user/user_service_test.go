// 本文件验证平台用户从目录加入、授权与移除。

package user

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type stubLDAP struct {
	entries []ldap.Entry // 目录条目替身
}

func (s stubLDAP) GetConfig(context.Context) (*ldap.View, error) { return &ldap.View{}, nil }
func (s stubLDAP) SaveConfig(context.Context, ldap.SaveInput) (*ldap.View, error) {
	return &ldap.View{}, nil
}
func (s stubLDAP) TestConfig(context.Context, ldap.SaveInput) (*ldap.ProbeResult, error) {
	return &ldap.ProbeResult{OK: true}, nil
}
func (s stubLDAP) SearchDirectory(context.Context, string) ([]ldap.Entry, error) {
	return s.entries, nil
}
func (s stubLDAP) Lookup(_ context.Context, _ []string) ([]ldap.Entry, error) { return s.entries, nil }
func (s stubLDAP) BindUser(context.Context, string, string) error             { return nil }

func TestUserAddDisableRemove(t *testing.T) {
	svc := newUserForTest(t, stubLDAP{entries: []ldap.Entry{{
		Username:   "e2euser",
		Name:       "E2E用户",
		Email:      "e2euser@msxf.com",
		Department: "测试",
		Title:      "工程师",
	}}})
	ctx := gctx.New()
	username := "e2euser"
	_, _ = svc.Remove(ctx, idsOf(t, svc, username), 0)

	added, err := svc.AddFromDirectory(ctx, []string{username}, role.CodeAlgo)
	if err != nil {
		t.Fatalf("add: %v", err)
	}
	if added != 1 {
		t.Fatalf("added=%d", added)
	}
	t.Cleanup(func() {
		ids := idsOf(t, svc, username)
		if len(ids) > 0 {
			_, _ = svc.Remove(context.Background(), ids, 0)
		}
	})

	enabled := true
	out, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 20, Keyword: username, Enabled: &enabled})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if out.Total != 1 || out.List[0].RoleCode != role.CodeAlgo {
		t.Fatalf("list: %+v", out)
	}
	id := out.List[0].ID
	if n, err := svc.UpdateStatus(ctx, []int64{id}, false); err != nil || n != 1 {
		t.Fatalf("disable: n=%d err=%v", n, err)
	}
	if n, err := svc.UpdateRole(ctx, []int64{id}, role.CodeSRE); err != nil || n != 1 {
		t.Fatalf("role: n=%d err=%v", n, err)
	}
	if _, err := svc.Remove(ctx, []int64{id}, id); !bizerr.Is(err, CodeCannotRemoveSelf) {
		t.Fatalf("expected cannot remove self, got %v", err)
	}
	if n, err := svc.Remove(ctx, []int64{id}, 0); err != nil || n != 1 {
		t.Fatalf("remove: n=%d err=%v", n, err)
	}
}

func idsOf(t *testing.T, svc Service, username string) []int64 {
	t.Helper()
	out, err := svc.List(gctx.New(), ListInput{PageNum: 1, PageSize: 20, Keyword: username})
	if err != nil {
		return nil
	}
	ids := make([]int64, 0, len(out.List))
	for _, item := range out.List {
		if item.Username == username {
			ids = append(ids, item.ID)
		}
	}
	return ids
}

func newUserForTest(t *testing.T, directory ldap.Service) Service {
	t.Helper()
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	if err := g.DB().PingMaster(); err != nil {
		t.Skipf("postgres unavailable: %v", err)
	}
	svc, err := New(directory, role.New())
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

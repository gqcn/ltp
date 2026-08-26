// 本文件验证团队创建、成员维护与重名拒绝。

package team

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type stubLDAP struct{}

func (stubLDAP) GetConfig(context.Context) (*ldap.View, error) { return &ldap.View{}, nil }
func (stubLDAP) SaveConfig(context.Context, ldap.SaveInput) (*ldap.View, error) {
	return &ldap.View{}, nil
}
func (stubLDAP) TestConfig(context.Context, ldap.SaveInput) (*ldap.ProbeResult, error) {
	return &ldap.ProbeResult{OK: true}, nil
}
func (stubLDAP) SearchDirectory(context.Context, string) ([]ldap.Entry, error) { return nil, nil }
func (stubLDAP) Lookup(context.Context, []string) ([]ldap.Entry, error)        { return nil, nil }
func (stubLDAP) BindUser(context.Context, string, string) error                { return nil }

func TestTeamCreateMemberAndDuplicateName(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	if err := g.DB().PingMaster(); err != nil {
		t.Skipf("postgres unavailable: %v", err)
	}
	userSvc, err := user.New(stubLDAP{}, role.New())
	if err != nil {
		t.Fatal(err)
	}
	svc, err := New(userSvc)
	if err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	users, err := userSvc.List(ctx, user.ListInput{PageNum: 1, PageSize: 10})
	if err != nil || len(users.List) < 2 {
		t.Skip("need at least two platform users")
	}
	owner := users.List[0]
	member := users.List[1]
	name := "E2E团队-" + time.Now().Format("150405.000")
	id, err := svc.Create(ctx, CreateInput{Name: name, Description: "测试", OwnerUserID: owner.ID})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = dao.SysTeamMember.Ctx(context.Background()).Where(do.SysTeamMember{TeamId: id}).Delete()
		_, _ = dao.SysTeam.Ctx(context.Background()).Where(do.SysTeam{Id: id}).Delete()
	})
	if _, err := svc.Create(ctx, CreateInput{Name: name, OwnerUserID: owner.ID}); !bizerr.Is(err, CodeNameExists) {
		t.Fatalf("expected name exists, got %v", err)
	}
	if err := svc.AddMember(ctx, id, member.ID); err != nil {
		t.Fatalf("add member: %v", err)
	}
	detail, err := svc.Get(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if detail.MemberCount < 2 || len(detail.Members) < 2 {
		t.Fatalf("members: %+v", detail)
	}
	if err := svc.RemoveMember(ctx, id, member.ID); err != nil {
		t.Fatalf("remove member: %v", err)
	}
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

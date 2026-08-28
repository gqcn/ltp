// 本文件验证配置集草稿与发布。

package traincfg

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestConfigDraftAndPublish(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	roleSvc := role.New()
	userSvc, err := user.New(stubLDAP{}, roleSvc)
	if err != nil {
		t.Fatal(err)
	}
	teamSvc, err := team.New(userSvc)
	if err != nil {
		t.Fatal(err)
	}
	users, err := userSvc.List(ctx, user.ListInput{PageNum: 1, PageSize: 1, Enabled: boolPtr(true)})
	if err != nil || len(users.List) == 0 {
		t.Skip("no ldap users")
	}
	u := users.List[0]
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "CfgTeam-" + time.Now().Format("150405.000"), OwnerUserID: u.ID})
	if err != nil {
		t.Fatal(err)
	}
	svc, err := New(teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	actor := Actor{UserID: u.ID, Username: u.Username, Nickname: u.Nickname}
	id, err := svc.Create(ctx, WriteInput{
		Actor:       actor,
		DisplayName: "Phase " + time.Now().Format("150405.000"),
		TeamID:      teamID,
		Framework:   fwMega,
		Visibility:  visTeam,
		Files:       []File{{Path: "a.yaml", Content: "x: 1"}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := svc.SaveDraft(ctx, id, WriteInput{
		Actor: actor, DisplayName: "Phase " + time.Now().Format("150405.000"), TeamID: teamID,
		Framework: fwMega, Visibility: visTeam, Files: []File{{Path: "a.yaml", Content: "x: 2"}},
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Publish(ctx, id, WriteInput{
		Actor: actor, DisplayName: "Phase pub", TeamID: teamID, Framework: fwMega, Visibility: visTeam,
		Message: "v1", Files: []File{{Path: "a.yaml", Content: "x: 3"}}, BaseVersion: 0,
	}); err != nil {
		t.Fatalf("publish: %v", err)
	}
	got, err := svc.Get(ctx, actor, id)
	if err != nil || got.LatestVersion != 1 {
		t.Fatalf("got=%+v err=%v", got, err)
	}
	if _, err := svc.Publish(ctx, id, WriteInput{
		Actor: actor, DisplayName: "Phase pub", TeamID: teamID, Framework: fwMega, Visibility: visTeam,
		Message: "v2", Files: []File{{Path: "a.yaml", Content: "x: 4"}}, BaseVersion: 0,
	}); !bizerr.Is(err, CodeConflict) {
		t.Fatalf("want conflict got %v", err)
	}
}

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

func boolPtr(v bool) *bool { return &v }

func findRepoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 8; i++ {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		dir = filepath.Dir(dir)
	}
	t.Fatal("go.mod not found")
	return ""
}

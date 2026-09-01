// 本文件验证实验 Run 列表按团队成员过滤，管理员与 SRE 可看全部。

package exprun

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestListRunsTeamScope(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	clusterID := time.Now().UnixNano()
	mineTeam := clusterID + 1
	otherTeam := clusterID + 2
	mineID := insertScopeRun(t, ctx, clusterID, mineTeam, "run-mine-"+time.Now().Format("150405.000"))
	otherID := insertScopeRun(t, ctx, clusterID, otherTeam, "run-other-"+time.Now().Format("150405.000"))
	svc := &serviceImpl{teamSvc: stubTeam{ids: []int64{mineTeam}}}

	member, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 11}, ClusterID: clusterID})
	if err != nil {
		t.Fatal(err)
	}
	assertRunIDs(t, member, []int64{mineID}, []int64{otherID})

	sre, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 12, SeeAll: true}, ClusterID: clusterID})
	if err != nil {
		t.Fatal(err)
	}
	assertRunIDs(t, sre, []int64{mineID, otherID}, nil)

	if _, err := svc.mustVisible(ctx, Actor{UserID: 11}, otherID); !bizerr.Is(err, CodeNotFound) {
		t.Fatalf("member should not see other team run: %v", err)
	}
	if _, err := svc.mustVisible(ctx, Actor{UserID: 12, SeeAll: true}, otherID); err != nil {
		t.Fatalf("sre should see other team run: %v", err)
	}
}

func insertScopeRun(t *testing.T, ctx context.Context, clusterID, teamID int64, name string) int64 {
	t.Helper()
	id, err := dao.ExpRun.Ctx(ctx).Data(do.ExpRun{
		Name:          name,
		ProjectId:     1,
		ClusterId:     clusterID,
		TeamId:        teamID,
		JobId:         time.Now().UnixNano(),
		OwnerUserId:   1,
		OwnerUsername: "tester",
		OwnerNickname: "tester",
	}).InsertAndGetId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = dao.ExpRun.Ctx(context.Background()).Where(do.ExpRun{Id: id}).Delete()
	})
	return id
}

func assertRunIDs(t *testing.T, mod *gdb.Model, want, hide []int64) {
	t.Helper()
	var rows []*entity.ExpRun
	if err := mod.Scan(&rows); err != nil {
		t.Fatal(err)
	}
	seen := map[int64]bool{}
	for _, row := range rows {
		seen[row.Id] = true
	}
	for _, id := range want {
		if !seen[id] {
			t.Fatalf("missing run %d", id)
		}
	}
	for _, id := range hide {
		if seen[id] {
			t.Fatalf("unexpected run %d", id)
		}
	}
}

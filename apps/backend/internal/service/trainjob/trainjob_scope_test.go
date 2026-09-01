// 本文件验证任务列表按团队成员过滤，管理员与 SRE 可看全部。

package trainjob

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
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type listTeamStub struct {
	team.Service
	ids []int64
}

func (s listTeamStub) ListIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	_ = ctx
	_ = userID
	return s.ids, nil
}

func TestListJobsTeamScope(t *testing.T) {
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
	mineID := insertScopeJob(t, ctx, clusterID, mineTeam, "scope-mine-"+time.Now().Format("150405.000"))
	otherID := insertScopeJob(t, ctx, clusterID, otherTeam, "scope-other-"+time.Now().Format("150405.000"))
	svc := &serviceImpl{teamSvc: listTeamStub{ids: []int64{mineTeam}}}

	member, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 11}, ClusterID: clusterID})
	if err != nil {
		t.Fatal(err)
	}
	assertJobIDs(t, member, []int64{mineID}, []int64{otherID})

	sre, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 12, SeeAll: true}, ClusterID: clusterID})
	if err != nil {
		t.Fatal(err)
	}
	assertJobIDs(t, sre, []int64{mineID, otherID}, nil)

	admin, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 13, IsAdmin: true}, ClusterID: clusterID})
	if err != nil {
		t.Fatal(err)
	}
	assertJobIDs(t, admin, []int64{mineID, otherID}, nil)

	if _, err := svc.mustVisible(ctx, Actor{UserID: 11}, otherID); !bizerr.Is(err, CodeNotFound) {
		t.Fatalf("member should not see other team job: %v", err)
	}
	if _, err := svc.mustVisible(ctx, Actor{UserID: 12, SeeAll: true}, otherID); err != nil {
		t.Fatalf("sre should see other team job: %v", err)
	}
}

func insertScopeJob(t *testing.T, ctx context.Context, clusterID, teamID int64, name string) int64 {
	t.Helper()
	id, err := dao.TrainJob.Ctx(ctx).Data(do.TrainJob{
		ClusterId:           clusterID,
		Name:                name,
		Namespace:           "maip",
		TeamId:              teamID,
		QueueId:             1,
		Nodes:               1,
		GpusPerNode:         1,
		GpuCount:            1,
		CpuPerNode:          1,
		MemGiPerNode:        1,
		Image:               "busybox",
		Command:             "sleep",
		Env:                 "{}",
		Workdir:             "/",
		OwnerUserId:         1,
		OwnerUsername:       "tester",
		SubmittedByUserId:   1,
		SubmittedByUsername: "tester",
		Status:              statusQueued,
		ConfigMounts:        "[]",
	}).InsertAndGetId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = dao.TrainJob.Ctx(context.Background()).Where(do.TrainJob{Id: id}).Delete()
	})
	return id
}

func assertJobIDs(t *testing.T, mod *gdb.Model, want, hide []int64) {
	t.Helper()
	var rows []*entity.TrainJob
	if err := mod.Scan(&rows); err != nil {
		t.Fatal(err)
	}
	seen := map[int64]bool{}
	for _, row := range rows {
		if row != nil {
			seen[row.Id] = true
		}
	}
	for _, id := range want {
		if !seen[id] {
			t.Fatalf("missing job %d", id)
		}
	}
	for _, id := range hide {
		if seen[id] {
			t.Fatalf("unexpected job %d", id)
		}
	}
}

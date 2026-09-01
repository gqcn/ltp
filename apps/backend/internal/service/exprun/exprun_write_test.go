// 本文件验证实验 Run 移动、删除与历史任务补建。

package exprun

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/expproject"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/trainjob"
)

type stubTeam struct {
	team.Service
	ids []int64
}

func (s stubTeam) ListIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	_ = ctx
	_ = userID
	return s.ids, nil
}

type stubJobs struct {
	trainjob.Service
	links []trainjob.JobLink
	items map[int64]*trainjob.Item
}

func (s stubJobs) ListJobLinksByCluster(ctx context.Context, clusterID int64) ([]trainjob.JobLink, error) {
	_ = ctx
	_ = clusterID
	return s.links, nil
}

func (s stubJobs) MapByIDs(ctx context.Context, ids []int64) (map[int64]*trainjob.Item, error) {
	_ = ctx
	_ = ids
	if s.items == nil {
		return map[int64]*trainjob.Item{}, nil
	}
	return s.items, nil
}

func TestMoveAndDeleteRun(t *testing.T) {
	svc, projSvc := prepareRunDB(t)
	ctx := gctx.New()
	actor := Actor{UserID: 1, IsAdmin: true}
	prefix := "exprun-" + time.Now().Format("150405.000")
	projID, err := projSvc.Create(ctx, expproject.Actor{UserID: 1}, prefix, "")
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	defaultID, err := projSvc.DefaultID(ctx)
	if err != nil {
		t.Fatalf("default: %v", err)
	}
	jobID := time.Now().UnixNano()
	runID, err := dao.ExpRun.Ctx(ctx).Data(do.ExpRun{
		Name:          prefix,
		ProjectId:     defaultID,
		ClusterId:     1,
		TeamId:        1,
		JobId:         jobID,
		OwnerUserId:   1,
		OwnerUsername: "algo",
		OwnerNickname: "算法",
	}).InsertAndGetId()
	if err != nil {
		t.Fatalf("insert run: %v", err)
	}
	t.Cleanup(func() {
		bg := context.Background()
		_, _ = dao.ExpRun.Ctx(bg).Where(do.ExpRun{Id: runID}).Delete()
		_, _ = dao.ExpProject.Ctx(bg).Where(do.ExpProject{Id: projID}).Delete()
	})
	if err := svc.Move(ctx, actor, runID, projID); err != nil {
		t.Fatalf("move: %v", err)
	}
	got, err := svc.Get(ctx, actor, runID)
	if err != nil || got.ProjectID != projID {
		t.Fatalf("moved project=%d err=%v", got.ProjectID, err)
	}
	if err := svc.Delete(ctx, actor, runID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.Get(ctx, actor, runID); err == nil {
		t.Fatal("deleted run still visible")
	}
	if err := svc.EnsureForJob(ctx, trainjob.JobLink{
		JobID:         jobID,
		ClusterID:     1,
		TeamID:        1,
		Name:          prefix,
		OwnerUsername: "algo",
		OwnerNickname: "算法",
		OwnerUserID:   1,
	}); err != nil {
		t.Fatalf("ensure after delete: %v", err)
	}
	n, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{JobId: jobID}).Count()
	if err != nil {
		t.Fatalf("count after ensure: %v", err)
	}
	if n != 0 {
		t.Fatalf("deleted job_id should not be recreated, got %d", n)
	}
}

func TestSyncMissingCreatesRun(t *testing.T) {
	jobID := time.Now().UnixNano()
	link := trainjob.JobLink{
		JobID:         jobID,
		ClusterID:     9,
		TeamID:        1,
		TeamName:      "t",
		Name:          "hist-job",
		OwnerUserID:   1,
		OwnerUsername: "algo",
		OwnerNickname: "算法",
	}
	svc, _ := prepareRunDB(t)
	svc.jobSvc = stubJobs{links: []trainjob.JobLink{link}}
	ctx := gctx.New()
	t.Cleanup(func() {
		_, _ = dao.ExpRun.Ctx(context.Background()).Where(do.ExpRun{JobId: jobID}).Delete()
	})
	svc.syncMissing(ctx, 9)
	n, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{JobId: jobID}).Count()
	if err != nil || n != 1 {
		t.Fatalf("expected backfill run count=%d err=%v", n, err)
	}
}

func prepareRunDB(t *testing.T) (*serviceImpl, expproject.Service) {
	t.Helper()
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	projSvc, err := expproject.New(stubTeam{ids: []int64{1}})
	if err != nil {
		t.Fatal(err)
	}
	return &serviceImpl{
		teamSvc:    stubTeam{ids: []int64{1}},
		projectSvc: projSvc,
		jobSvc:     stubJobs{},
	}, projSvc
}

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

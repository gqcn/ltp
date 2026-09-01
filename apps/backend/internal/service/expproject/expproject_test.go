// 本文件验证实验项目名称唯一与删除。

package expproject

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
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/team"
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

func TestCreateRejectsBlankName(t *testing.T) {
	svc := &serviceImpl{teamSvc: stubTeam{}}
	if _, err := svc.Create(context.Background(), Actor{UserID: 1}, "  ", ""); err == nil {
		t.Fatal("expected invalid name")
	}
}

func TestUpdateRenamesProject(t *testing.T) {
	svc := prepareProjectDB(t)
	ctx := gctx.New()
	prefix := "expren-" + time.Now().Format("150405.000")
	id, err := svc.Create(ctx, Actor{UserID: 1}, prefix, "old desc")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = dao.ExpProject.Ctx(context.Background()).Where(do.ExpProject{Id: id}).Delete()
	})
	next := prefix + "-b"
	if err := svc.Update(ctx, Actor{UserID: 1}, id, next, "new desc"); err != nil {
		t.Fatalf("rename: %v", err)
	}
	got, err := svc.Get(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != next || got.DisplayName != next || got.Description != "new desc" {
		t.Fatalf("got %+v", got)
	}
}

func TestUpdateRejectsDefaultRename(t *testing.T) {
	svc := prepareProjectDB(t)
	ctx := gctx.New()
	id, err := svc.DefaultID(ctx)
	if err != nil {
		t.Fatalf("default: %v", err)
	}
	if err := svc.Update(ctx, Actor{UserID: 1}, id, "not-default", "keep"); err == nil {
		t.Fatal("expected default rename to fail")
	}
}

func TestUpdateRejectsDuplicateName(t *testing.T) {
	svc := prepareProjectDB(t)
	ctx := gctx.New()
	a := "expdup-a-" + time.Now().Format("150405.000")
	b := "expdup-b-" + time.Now().Format("150405.000")
	idA, err := svc.Create(ctx, Actor{UserID: 1}, a, "")
	if err != nil {
		t.Fatalf("create a: %v", err)
	}
	idB, err := svc.Create(ctx, Actor{UserID: 1}, b, "")
	if err != nil {
		t.Fatalf("create b: %v", err)
	}
	t.Cleanup(func() {
		bg := context.Background()
		_, _ = dao.ExpProject.Ctx(bg).Where(do.ExpProject{Id: idA}).Delete()
		_, _ = dao.ExpProject.Ctx(bg).Where(do.ExpProject{Id: idB}).Delete()
	})
	if err := svc.Update(ctx, Actor{UserID: 1}, idB, a, ""); err == nil {
		t.Fatal("expected duplicate name")
	}
}

func TestDeleteRejectsDefaultProject(t *testing.T) {
	svc := prepareProjectDB(t)
	ctx := gctx.New()
	id, err := svc.DefaultID(ctx)
	if err != nil {
		t.Fatalf("default: %v", err)
	}
	if err := svc.Delete(ctx, Actor{UserID: 1}, id); err == nil {
		t.Fatal("expected default project delete to fail")
	}
}

func TestDeleteReassignsRunsAndFreesName(t *testing.T) {
	svc := prepareProjectDB(t)
	ctx := gctx.New()
	prefix := "expdel-" + time.Now().Format("150405.000")
	id, err := svc.Create(ctx, Actor{UserID: 1}, prefix, "to delete")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	defaultID, err := svc.DefaultID(ctx)
	if err != nil {
		t.Fatalf("default: %v", err)
	}
	jobID := time.Now().UnixNano()
	runID, err := dao.ExpRun.Ctx(ctx).Data(do.ExpRun{
		Name:          prefix + "-run",
		ProjectId:     id,
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
		_, _ = dao.ExpProject.Ctx(bg).Where(do.ExpProject{Name: prefix}).Delete()
	})
	if err := svc.Delete(ctx, Actor{UserID: 1}, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	var run entity.ExpRun
	if err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: runID}).Scan(&run); err != nil || run.ProjectId != defaultID {
		t.Fatalf("run reassign got=%d want=%d err=%v", run.ProjectId, defaultID, err)
	}
	if _, err := svc.Get(ctx, id); err == nil {
		t.Fatal("deleted project still visible")
	}
	if _, err := svc.Create(ctx, Actor{UserID: 1}, prefix, "recreate"); err != nil {
		t.Fatalf("recreate name: %v", err)
	}
}

func prepareProjectDB(t *testing.T) *serviceImpl {
	t.Helper()
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	return &serviceImpl{teamSvc: stubTeam{ids: []int64{1}}}
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

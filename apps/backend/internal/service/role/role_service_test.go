// 本文件验证角色列表与改名。

package role

import (
	"os"
	"path/filepath"
	"testing"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestRoleListAndRename(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	if err := g.DB().PingMaster(); err != nil {
		t.Skipf("postgres unavailable: %v", err)
	}
	svc := New()
	ctx := gctx.New()
	list, err := svc.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) < 2 {
		t.Fatalf("expected two builtin roles, got %d", len(list))
	}
	var algo *Item
	for _, item := range list {
		if item.Code == CodeAlgo {
			algo = item
		}
	}
	if algo == nil {
		t.Fatal("algo role missing")
	}
	original := algo.Name
	t.Cleanup(func() { _ = svc.Rename(gctx.New(), algo.ID, original, "测试") })
	if err := svc.Rename(ctx, algo.ID, "算法专家-测试", "测试"); err != nil {
		t.Fatalf("rename: %v", err)
	}
	if err := svc.Rename(ctx, algo.ID, "SRE工程师", "测试"); !bizerr.Is(err, CodeNameExists) {
		t.Fatalf("expected name exists, got %v", err)
	}
	got, err := svc.GetByCode(ctx, CodeAlgo)
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "算法专家-测试" {
		t.Fatalf("name=%s", got.Name)
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

// 本文件验证数据中心服务的创建、列表、保护规则与删除。

package datacenter

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestDatacenterCRUD(t *testing.T) {
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

	svc, err := New(NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}

	code := "t-" + time.Now().Format("150405.000")
	code = normalizeCodeForTest(code)
	id, err := svc.Create(ctx, CreateInput{
		Code:      code,
		Name:      "测试数据中心",
		ShortName: "测试",
		Region:    "重庆",
		Color:     "#3b82f6",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_ = svc.Delete(context.Background(), id)
	})

	item, err := svc.Get(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if item.Code != code || !item.Enabled || item.IsDefault {
		t.Fatalf("unexpected item: %+v", item)
	}
	if item.Label != consts.LabelKeyDatacenter+"="+code {
		t.Fatalf("label: %s", item.Label)
	}
	if item.CreatedAt == 0 {
		t.Fatal("createdAt should be unix milliseconds")
	}

	if err := svc.Update(ctx, UpdateInput{ID: id, Name: "测试数据中心-改", ShortName: "测改", Region: "新疆", Color: "#a78bfa"}); err != nil {
		t.Fatalf("update: %v", err)
	}
	if err := svc.UpdateStatus(ctx, id, false); err != nil {
		t.Fatalf("disable: %v", err)
	}
	enabled := false
	out, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 10, Keyword: code, Enabled: &enabled})
	if err != nil {
		t.Fatalf("list disabled: %v", err)
	}
	if out.Total != 1 {
		t.Fatalf("expected 1 disabled row, got %d", out.Total)
	}

	list, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if list.Total < 2 {
		t.Fatalf("expected default plus created row, total=%d", list.Total)
	}

	if err := svc.Delete(ctx, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.Get(ctx, id); !bizerr.Is(err, CodeNotFound) {
		t.Fatalf("expected not found after delete, got %v", err)
	}

	defaults, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 50, Keyword: consts.DefaultDatacenterCode})
	if err != nil {
		t.Fatalf("list default: %v", err)
	}
	var defaultID int64
	for _, row := range defaults.List {
		if row.Code == consts.DefaultDatacenterCode {
			defaultID = row.ID
			if err := svc.UpdateStatus(ctx, row.ID, false); !bizerr.Is(err, CodeDefaultProtected) {
				t.Fatalf("expected default protect on disable, got %v", err)
			}
			if err := svc.Delete(ctx, row.ID); !bizerr.Is(err, CodeDefaultProtected) {
				t.Fatalf("expected default protect on delete, got %v", err)
			}
		}
	}
	if defaultID == 0 {
		t.Fatal("default datacenter missing")
	}

	if _, err := svc.Create(ctx, CreateInput{Code: "default", Name: "x", ShortName: "x"}); err == nil {
		t.Fatal("expected reserved code rejection")
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

func normalizeCodeForTest(code string) string {
	out := make([]byte, 0, len(code))
	for i := 0; i < len(code); i++ {
		ch := code[i]
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-' {
			out = append(out, ch)
		}
	}
	if len(out) == 0 {
		return "t-code"
	}
	return string(out)
}

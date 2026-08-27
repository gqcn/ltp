// 本文件验证数据中心服务的创建、列表、保护规则与删除。

package datacenter

import (
	"context"
	"os"
	"path/filepath"
	"strings"
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
	out, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 10, Keyword: code})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if out.Total != 1 {
		t.Fatalf("expected 1 row, got %d", out.Total)
	}
	if !out.List[0].Enabled {
		t.Fatal("datacenter must stay enabled; status updates are removed")
	}

	list, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 50, Keyword: "默认数据中心"})
	if err != nil {
		t.Fatalf("list builtin default: %v", err)
	}
	for _, row := range list.List {
		if row.Name == "默认数据中心" || (row.Code == "default" && row.IsDefault) {
			t.Fatalf("builtin default datacenter must be gone, got %+v", row)
		}
	}

	if err := svc.Delete(ctx, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.Get(ctx, id); !bizerr.Is(err, CodeNotFound) {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}

// stubUsageCounter 按标识返回预设关联计数，用于删除占用门禁测试。
type stubUsageCounter struct {
	stats map[string]UsageStats // 标识到关联计数
}

// CountByCodes 返回预设计数；缺失标识视为零值。
func (s stubUsageCounter) CountByCodes(_ context.Context, codes []string) (map[string]UsageStats, error) {
	out := make(map[string]UsageStats, len(codes))
	for _, code := range codes {
		out[code] = s.stats[code]
	}
	return out, nil
}

func TestDatacenterDeleteRejectedWhenInUse(t *testing.T) {
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

	code := "t-" + time.Now().Format("150405.000")
	code = normalizeCodeForTest(code)
	createSvc, err := New(NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	id, err := createSvc.Create(ctx, CreateInput{
		Code:      code,
		Name:      "占用数据中心",
		ShortName: "占用",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_ = createSvc.Delete(context.Background(), id)
	})

	svc, err := New(stubUsageCounter{stats: map[string]UsageStats{
		code: {Nodes: 2, Queues: 1, Clusters: 1},
	}})
	if err != nil {
		t.Fatal(err)
	}
	err = svc.Delete(ctx, id)
	if !bizerr.Is(err, CodeInUse) {
		t.Fatalf("expected in-use, got %v", err)
	}
	if !strings.Contains(err.Error(), "2 节点") || !strings.Contains(err.Error(), "1 队列") {
		t.Fatalf("error should include usage counts, got %v", err)
	}
	if _, err := createSvc.Get(ctx, id); err != nil {
		t.Fatalf("row must remain after rejected delete: %v", err)
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

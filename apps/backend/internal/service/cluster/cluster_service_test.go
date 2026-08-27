// 本文件验证集群接入与列表在 kube 替身下的行为。

package cluster

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestClusterCreateListDelete(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	fake := &kube.Fake{
		Version:   "v1.27.16",
		APIServer: "https://127.0.0.1:6443",
		Nodes: []kube.NodeSnapshot{{
			Name:          "n1",
			Ready:         true,
			Schedulable:   true,
			Labels:        map[string]string{"maip.io/datacenter": "cq-lj"},
			CPUTotalMilli: 8000,
			MemTotalBytes: 8 << 30,
		}},
	}
	svc, err := New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	id, err := svc.Create(ctx, CreateInput{DisplayName: "UT集群-" + t.Name(), Kubeconfig: "apiVersion: v1\nkind: Config\n"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() { _ = svc.Delete(context.Background(), id) })
	item, err := svc.Get(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if item.Status != StatusHealthy || item.Version != "v1.27.16" {
		t.Fatalf("item=%+v", item)
	}
	if item.NodesReady != 1 {
		t.Fatalf("nodesReady=%d", item.NodesReady)
	}
	if _, err := svc.Create(ctx, CreateInput{DisplayName: item.DisplayName, Kubeconfig: "x"}); !bizerr.Is(err, CodeNameExists) {
		t.Fatalf("want name exists, got %v", err)
	}
	if fake.ListNodesCalls != 1 {
		t.Fatalf("first get should list nodes once, got %d", fake.ListNodesCalls)
	}
	if _, err := svc.Get(ctx, id); err != nil {
		t.Fatal(err)
	}
	if fake.ListNodesCalls != 1 {
		t.Fatalf("inspection cache should skip second list, got %d", fake.ListNodesCalls)
	}
	if err := svc.Update(ctx, UpdateInput{ID: id, DisplayName: item.DisplayName, Kubeconfig: "apiVersion: v1\nkind: Config\n"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Get(ctx, id); err != nil {
		t.Fatal(err)
	}
	if fake.ListNodesCalls != 2 {
		t.Fatalf("kubeconfig update should drop inspection cache, got %d", fake.ListNodesCalls)
	}
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

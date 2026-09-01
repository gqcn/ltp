// 本文件验证隔离备注会随节点列表返回，入池后不再展示。

package node

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/kube"
)

func TestListIncludesLatestIsolateRemark(t *testing.T) {
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
			Name:        "gpu-node-h200",
			Ready:       true,
			Schedulable: true,
			Labels:      map[string]string{},
		}},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	clusterID, err := clusterSvc.Create(ctx, cluster.CreateInput{
		DisplayName: "UT节点-" + t.Name(),
		Kubeconfig:  "apiVersion: v1\nkind: Config\n",
	})
	if err != nil {
		t.Fatalf("create cluster: %v", err)
	}
	t.Cleanup(func() {
		_, _ = dao.OpsNodeEvent.Ctx(context.Background()).Where(do.OpsNodeEvent{ClusterId: clusterID}).Delete()
		_ = clusterSvc.Delete(context.Background(), clusterID)
	})

	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	svc, err := New(clusterSvc, dcSvc, nil)
	if err != nil {
		t.Fatal(err)
	}

	if err := svc.Isolate(ctx, MutateInput{
		ClusterID: clusterID,
		Names:     []string{"gpu-node-h200"},
		Operator:  "tester",
		Remark:    "网卡抖动，先隔离",
	}); err != nil {
		t.Fatalf("isolate: %v", err)
	}
	if err := svc.Isolate(ctx, MutateInput{
		ClusterID: clusterID,
		Names:     []string{"gpu-node-h200"},
		Operator:  "tester",
		Remark:    "升级固件",
	}); err != nil {
		t.Fatalf("isolate again: %v", err)
	}

	out, err := svc.List(ctx, ListInput{ClusterID: clusterID, PageNum: 1, PageSize: 10})
	if err != nil {
		t.Fatal(err)
	}
	if len(out.List) != 1 {
		t.Fatalf("len=%d", len(out.List))
	}
	item := out.List[0]
	if !item.Isolated {
		t.Fatal("expected isolated")
	}
	if item.IsolateRemark != "升级固件" {
		t.Fatalf("remark=%q", item.IsolateRemark)
	}

	if err := svc.Recover(ctx, MutateInput{
		ClusterID: clusterID,
		Names:     []string{"gpu-node-h200"},
		Operator:  "tester",
		Remark:    "维护结束",
	}); err != nil {
		t.Fatalf("recover: %v", err)
	}
	out, err = svc.List(ctx, ListInput{ClusterID: clusterID, PageNum: 1, PageSize: 10})
	if err != nil {
		t.Fatal(err)
	}
	item = out.List[0]
	if item.Isolated {
		t.Fatal("expected recovered")
	}
	if item.IsolateRemark != "" {
		t.Fatalf("remark after recover=%q", item.IsolateRemark)
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

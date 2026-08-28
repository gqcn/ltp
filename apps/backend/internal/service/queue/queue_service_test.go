// 本文件验证队列标识校验与 Volcano 同步创建。

package queue

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestNormalizeDNS1123(t *testing.T) {
	if _, err := normalizeDNS1123("Lab_Default"); err == nil {
		t.Fatal("expected invalid")
	}
	if _, err := normalizeDNS1123("default"); err == nil {
		t.Fatal("expected reserved name")
	}
	if _, err := normalizeDNS1123("root"); err == nil {
		t.Fatal("expected reserved name")
	}
	if _, err := normalizeDNS1123("-lab"); err == nil {
		t.Fatal("expected leading hyphen invalid")
	}
	name, err := normalizeDNS1123("lab-default")
	if err != nil || name != "lab-default" {
		t.Fatalf("name=%s err=%v", name, err)
	}
	dotted, err := normalizeDNS1123("lab.gpu")
	if err != nil || dotted != "lab.gpu" {
		t.Fatalf("dotted name=%s err=%v", dotted, err)
	}
}

func TestQueueCreateSyncsVolcano(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "qdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{},
		Nodes: []kube.NodeSnapshot{{
			Name:          "gpu-node-h200",
			Ready:         true,
			Schedulable:   true,
			Labels:        map[string]string{consts.LabelKeyDatacenter: code, consts.LabelKeyGPUType: "NVIDIA-H200"},
			GPUTotal:      8,
			CPUTotalMilli: 32000,
			MemTotalBytes: 64 << 30,
		}},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "队列测试", ShortName: "测"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = dcSvc.Delete(context.Background(), dcID) })

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
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "QTeam-" + time.Now().Format("150405.000"), OwnerUserID: users.List[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = teamSvc.RemoveMember(context.Background(), teamID, users.List[0].ID)
	})

	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "QCls-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = clusterSvc.Delete(context.Background(), clsID) })

	svc, err := New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	qname := "lab-" + time.Now().Format("150405")
	qid, err := svc.Create(ctx, WriteInput{
		ClusterID:      clsID,
		Name:           qname,
		DisplayName:    "实验队列",
		DatacenterCode: code,
		GPUType:        "NVIDIA-H200",
		GPUQuota:       2,
		CPUQuota:       8,
		MemQuotaGi:     16,
		TeamIDs:        []int64{teamID},
	})
	if err != nil {
		t.Fatalf("create queue: %v", err)
	}
	t.Cleanup(func() { _ = svc.Delete(context.Background(), qid) })
	if _, ok := fake.Queues[qname]; !ok {
		t.Fatal("volcano queue not created")
	}
	if _, err := svc.Create(ctx, WriteInput{
		ClusterID: clsID, Name: qname, DisplayName: "x", DatacenterCode: code, GPUType: "NVIDIA-H200", TeamIDs: []int64{teamID},
	}); !bizerr.Is(err, CodeNameExists) {
		t.Fatalf("want name exists got %v", err)
	}
}

func TestCapacityPreviewOmitsPlaceholderGPUType(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "qdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{},
		Nodes: []kube.NodeSnapshot{
			{
				Name:          "gpu-node-h200",
				Ready:         true,
				Schedulable:   true,
				Labels:        map[string]string{consts.LabelKeyDatacenter: code, consts.LabelKeyGPUType: "NVIDIA-H200"},
				GPUTotal:      8,
				CPUTotalMilli: 8000,
				MemTotalBytes: 8 << 30,
			},
			{
				Name:          "control-plane",
				Ready:         true,
				Schedulable:   true,
				Labels:        map[string]string{consts.LabelKeyDatacenter: code},
				CPUTotalMilli: 4000,
				MemTotalBytes: 4 << 30,
			},
		},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "容量测试", ShortName: "容"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = dcSvc.Delete(context.Background(), dcID) })
	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "QCap-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = clusterSvc.Delete(context.Background(), clsID) })
	roleSvc := role.New()
	userSvc, err := user.New(stubLDAP{}, roleSvc)
	if err != nil {
		t.Fatal(err)
	}
	teamSvc, err := team.New(userSvc)
	if err != nil {
		t.Fatal(err)
	}
	svc, err := New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	out, err := svc.CapacityPreview(ctx, clsID, code, nil, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.GPUTypes) != 1 || out.GPUTypes[0].Type != "NVIDIA-H200" || out.GPUTypes[0].Total != 8 {
		t.Fatalf("gpuTypes=%+v", out.GPUTypes)
	}
	for _, item := range out.GPUTypes {
		if item.Type == "cpu" || item.Type == "" {
			t.Fatalf("placeholder gpu type %q", item.Type)
		}
	}
}

func TestCreateRejectsQuotaOverCapacity(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "qdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{},
		Nodes: []kube.NodeSnapshot{{
			Name:          "gpu-node-h200",
			Ready:         true,
			Schedulable:   true,
			Labels:        map[string]string{consts.LabelKeyDatacenter: code, consts.LabelKeyGPUType: "NVIDIA-H200"},
			GPUTotal:      8,
			CPUTotalMilli: 8000,
			MemTotalBytes: 16 << 30,
		}},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "超额测试", ShortName: "超"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = dcSvc.Delete(context.Background(), dcID) })
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
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "QOver-" + time.Now().Format("150405.000"), OwnerUserID: users.List[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = teamSvc.RemoveMember(context.Background(), teamID, users.List[0].ID) })
	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "QOverCls-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = clusterSvc.Delete(context.Background(), clsID) })
	svc, err := New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.Create(ctx, WriteInput{
		ClusterID:      clsID,
		Name:           "over-" + time.Now().Format("150405"),
		DisplayName:    "超额队列",
		DatacenterCode: code,
		GPUType:        "NVIDIA-H200",
		GPUQuota:       9,
		TeamIDs:        []int64{teamID},
	})
	if err == nil || !strings.Contains(err.Error(), "GPU 额度超过剩余容量") {
		t.Fatalf("want over-capacity, got %v", err)
	}
}

func TestQueueResyncRecreatesMissingCR(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "qdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{},
		Nodes: []kube.NodeSnapshot{{
			Name:          "gpu-node-h200",
			Ready:         true,
			Schedulable:   true,
			Labels:        map[string]string{consts.LabelKeyDatacenter: code, consts.LabelKeyGPUType: "NVIDIA-H200"},
			GPUTotal:      8,
			CPUTotalMilli: 8000,
			MemTotalBytes: 16 << 30,
		}},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "同步测试", ShortName: "同"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = dcSvc.Delete(context.Background(), dcID) })
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
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "QSync-" + time.Now().Format("150405.000"), OwnerUserID: users.List[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = teamSvc.RemoveMember(context.Background(), teamID, users.List[0].ID) })
	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "QSyncCls-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = clusterSvc.Delete(context.Background(), clsID) })
	svc, err := New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	qname := "sync-" + time.Now().Format("150405")
	qid, err := svc.Create(ctx, WriteInput{
		ClusterID:      clsID,
		Name:           qname,
		DisplayName:    "同步队列",
		DatacenterCode: code,
		GPUType:        "NVIDIA-H200",
		GPUQuota:       1,
		TeamIDs:        []int64{teamID},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() { _ = svc.Delete(context.Background(), qid) })
	if err := fake.DeleteQueue(ctx, qname); err != nil {
		t.Fatal(err)
	}
	listed, err := svc.List(ctx, ListInput{ClusterID: clsID, PageNum: 1, PageSize: 10})
	if err != nil {
		t.Fatal(err)
	}
	if len(listed.List) != 1 || listed.List[0].SyncError != syncErrQueueMissing {
		t.Fatalf("want missing sync error, got %+v", listed.List)
	}
	if err := svc.Resync(ctx, qid); err != nil {
		t.Fatalf("resync: %v", err)
	}
	if _, err := fake.GetQueue(ctx, qname); err != nil {
		t.Fatalf("queue still missing: %v", err)
	}
	listed, err = svc.List(ctx, ListInput{ClusterID: clsID, PageNum: 1, PageSize: 10})
	if err != nil {
		t.Fatal(err)
	}
	if listed.List[0].SyncError != "" {
		t.Fatalf("syncError after resync=%q", listed.List[0].SyncError)
	}
}

func TestListFiltersByEnabled(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "qdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{},
		Nodes: []kube.NodeSnapshot{{
			Name:          "gpu-node-h200",
			Ready:         true,
			Schedulable:   true,
			Labels:        map[string]string{consts.LabelKeyDatacenter: code, consts.LabelKeyGPUType: "NVIDIA-H200"},
			GPUTotal:      8,
			CPUTotalMilli: 8000,
			MemTotalBytes: 16 << 30,
		}},
	}
	clusterSvc, err := cluster.New(kube.NewFactoryWith(func(context.Context, []byte) (kube.ClusterClient, error) {
		return fake, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	dcSvc, err := datacenter.New(datacenter.NewZeroUsageCounter())
	if err != nil {
		t.Fatal(err)
	}
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "筛选测试", ShortName: "筛"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = dcSvc.Delete(context.Background(), dcID) })
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
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "QFlt-" + time.Now().Format("150405.000"), OwnerUserID: users.List[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = teamSvc.RemoveMember(context.Background(), teamID, users.List[0].ID) })
	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "QFltCls-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = clusterSvc.Delete(context.Background(), clsID) })
	svc, err := New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	stamp := time.Now().Format("150405")
	openName := "stf-" + stamp + "-on"
	closedName := "stf-" + stamp + "-off"
	openID, err := svc.Create(ctx, WriteInput{
		ClusterID: clsID, Name: openName, DisplayName: "启用队列", DatacenterCode: code,
		GPUType: "NVIDIA-H200", GPUQuota: 1, TeamIDs: []int64{teamID},
	})
	if err != nil {
		t.Fatalf("create open: %v", err)
	}
	t.Cleanup(func() { _ = svc.Delete(context.Background(), openID) })
	closedID, err := svc.Create(ctx, WriteInput{
		ClusterID: clsID, Name: closedName, DisplayName: "禁用队列", DatacenterCode: code,
		GPUType: "NVIDIA-H200", GPUQuota: 1, TeamIDs: []int64{teamID},
	})
	if err != nil {
		t.Fatalf("create closed: %v", err)
	}
	t.Cleanup(func() { _ = svc.Delete(context.Background(), closedID) })
	if err := svc.UpdateStatus(ctx, closedID, false); err != nil {
		t.Fatalf("disable: %v", err)
	}
	keyword := "stf-" + stamp
	enabled := true
	openList, err := svc.List(ctx, ListInput{ClusterID: clsID, PageNum: 1, PageSize: 10, Keyword: keyword, Enabled: &enabled})
	if err != nil {
		t.Fatal(err)
	}
	if openList.Total != 1 || len(openList.List) != 1 || openList.List[0].Name != openName || !openList.List[0].Enabled {
		t.Fatalf("enabled filter=%+v", openList)
	}
	disabled := false
	closedList, err := svc.List(ctx, ListInput{ClusterID: clsID, PageNum: 1, PageSize: 10, Keyword: keyword, Enabled: &disabled})
	if err != nil {
		t.Fatal(err)
	}
	if closedList.Total != 1 || len(closedList.List) != 1 || closedList.List[0].Name != closedName || closedList.List[0].Enabled {
		t.Fatalf("disabled filter=%+v", closedList)
	}
	all, err := svc.List(ctx, ListInput{ClusterID: clsID, PageNum: 1, PageSize: 10, Keyword: keyword})
	if err != nil {
		t.Fatal(err)
	}
	if all.Total != 2 {
		t.Fatalf("all total=%d", all.Total)
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

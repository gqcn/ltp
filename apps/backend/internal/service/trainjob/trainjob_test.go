// 本文件验证训练任务创建会写入 Volcano Job。

package trainjob

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/service/alert"
	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/datacenter"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/queue"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/internal/service/traincfg"
	"github.com/gqcn/ltp/internal/service/user"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestCreateJobWritesVolcano(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	code := "jdc-" + time.Now().Format("150405")
	fake := &kube.Fake{
		Queues: map[string]kube.QueueSnapshot{
			"lab-jobq": {Name: "lab-jobq", State: "Open"},
		},
		Jobs: map[string]*kube.VolcanoJob{},
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
	dcID, err := dcSvc.Create(ctx, datacenter.CreateInput{Code: code, Name: "任务测试", ShortName: "测"})
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
	u := users.List[0]
	teamID, err := teamSvc.Create(ctx, team.CreateInput{Name: "JTeam-" + time.Now().Format("150405.000"), OwnerUserID: u.ID})
	if err != nil {
		t.Fatal(err)
	}
	clsID, err := clusterSvc.Create(ctx, cluster.CreateInput{DisplayName: "JCls-" + time.Now().Format("150405.000"), Kubeconfig: "kind: Config\n"})
	if err != nil {
		t.Fatal(err)
	}
	queueSvc, err := queue.New(clusterSvc, dcSvc, teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	qname := "lab-j" + time.Now().Format("150405")
	fake.Queues[qname] = kube.QueueSnapshot{Name: qname, State: "Open"}
	qid, err := queueSvc.Create(ctx, queue.WriteInput{
		ClusterID: clsID, Name: qname, DisplayName: "任务队列", DatacenterCode: code,
		GPUType: "NVIDIA-H200", GPUQuota: 8, CPUQuota: 32, MemQuotaGi: 64, TeamIDs: []int64{teamID},
	})
	if err != nil {
		t.Fatalf("queue: %v", err)
	}
	cfgSvc, err := traincfg.New(teamSvc)
	if err != nil {
		t.Fatal(err)
	}
	alertSvc, err := alert.New(alert.Config{})
	if err != nil {
		t.Fatal(err)
	}
	svc, err := New(clusterSvc, queueSvc, teamSvc, userSvc, cfgSvc, alertSvc)
	if err != nil {
		t.Fatal(err)
	}
	actor := Actor{UserID: u.ID, Username: u.Username, Nickname: u.Nickname}
	jobName := "job-" + time.Now().Format("150405")
	id, err := svc.Create(ctx, CreateInput{
		Actor: actor, ClusterID: clsID, Name: jobName, Workdir: "/data/hpc/home/" + u.Username,
		Priority: priorityP2, TeamID: teamID, QueueID: qid, Nodes: 1, GpusPerNode: 1,
		CPUPerNode: 4, MemGiPerNode: 8, Image: "harbor.msxf.com/ai/demo:1", Command: "sleep 1",
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}
	if fake.Jobs[consts.TrainingNamespace+"/"+jobName] == nil {
		t.Fatal("volcano job missing")
	}
	got, err := svc.Get(ctx, actor, id)
	if err != nil || got.Name != jobName {
		t.Fatalf("get=%+v err=%v", got, err)
	}
	if err := fake.DeleteJob(ctx, consts.TrainingNamespace, jobName, ""); err != nil {
		t.Fatal(err)
	}
	if err := svc.Cancel(ctx, actor, id); err != nil {
		t.Fatalf("cancel missing volcano job: %v", err)
	}
	after, err := svc.Get(ctx, actor, id)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status != statusCancelled {
		t.Fatalf("status=%s", after.Status)
	}
	if _, err := svc.Create(ctx, CreateInput{
		Actor: actor, ClusterID: clsID, Name: "Bad_Name", Workdir: "/tmp", Priority: priorityP2,
		TeamID: teamID, QueueID: qid, Nodes: 1, GpusPerNode: 1, CPUPerNode: 1, MemGiPerNode: 1,
		Image: "harbor.msxf.com/ai/demo:1", Command: "true",
	}); !bizerr.Is(err, CodeInvalidInput) {
		t.Fatalf("want invalid name got %v", err)
	}

	stamp := time.Now().Format("150405.000")
	cfgID, err := cfgSvc.Create(ctx, traincfg.WriteInput{
		Actor:       traincfg.Actor{UserID: u.ID, Username: u.Username, Nickname: u.Nickname},
		DisplayName: "挂载配置 " + stamp,
		TeamID:      teamID,
		Framework:   "megatron",
		Visibility:  "team",
		Files:       []traincfg.File{{Path: "a.yaml", Content: "x: 1"}},
	})
	if err != nil {
		t.Fatalf("create config: %v", err)
	}
	if _, err := cfgSvc.Publish(ctx, cfgID, traincfg.WriteInput{
		Actor:       traincfg.Actor{UserID: u.ID, Username: u.Username, Nickname: u.Nickname},
		DisplayName: "挂载配置 " + stamp,
		TeamID:      teamID,
		Framework:   "megatron",
		Visibility:  "team",
		Message:     "v1",
		Files:       []traincfg.File{{Path: "a.yaml", Content: "x: 1"}},
		BaseVersion: 0,
	}); err != nil {
		t.Fatalf("publish config: %v", err)
	}
	mountJob := "mnt-" + time.Now().Format("150405")
	if _, err := svc.Create(ctx, CreateInput{
		Actor: actor, ClusterID: clsID, Name: mountJob, Workdir: "/tmp",
		Priority: priorityP2, TeamID: teamID, QueueID: qid, Nodes: 1, GpusPerNode: 1,
		CPUPerNode: 1, MemGiPerNode: 1, Image: "harbor.msxf.com/ai/demo:1", Command: "true",
		Mounts: []MountInput{{SetID: cfgID, Version: 1, MountPath: "/etc/job-config"}},
	}); err != nil {
		t.Fatalf("create job with mount: %v", err)
	}
	cmKey := consts.TrainingNamespace + "/" + mountJob + "-cfg-0"
	if fake.ConfigMaps[cmKey]["a.yaml"] != "x: 1" {
		t.Fatalf("configmap data=%v", fake.ConfigMaps[cmKey])
	}
	owners := fake.ConfigMapOwners[cmKey]
	job := fake.Jobs[consts.TrainingNamespace+"/"+mountJob]
	if job == nil || len(owners) != 1 || owners[0].UID != job.UID || owners[0].Name != mountJob || owners[0].Kind == "" {
		t.Fatalf("job=%+v owners=%+v", job, owners)
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

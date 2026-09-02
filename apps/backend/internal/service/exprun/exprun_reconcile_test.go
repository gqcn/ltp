// 本文件验证读盘日志解析与快照回写。

package exprun

import (
	"fmt"
	"testing"
	"time"

	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
)

func TestParseMetricsLine(t *testing.T) {
	payload, msg := parseMetricsLine("info\n{\"ok\":true,\"step\":80,\"loss\":1.224,\"tokensPerSec\":1180000,\"maxSteps\":80}\n")
	if msg != "" || payload == nil {
		t.Fatalf("payload=%+v msg=%s", payload, msg)
	}
	if payload.Step == nil || *payload.Step != 80 {
		t.Fatalf("step=%v", payload.Step)
	}
	if payload.Loss == nil || *payload.Loss != 1.224 {
		t.Fatalf("loss=%v", payload.Loss)
	}
	if payload.TokensPerSec == nil || *payload.TokensPerSec != 1180000 {
		t.Fatalf("tps=%v", payload.TokensPerSec)
	}
	if payload.MaxSteps == nil || *payload.MaxSteps != 80 {
		t.Fatalf("maxSteps=%v", payload.MaxSteps)
	}
	_, msg = parseMetricsLine(`{"ok":false,"error":"未读到指标"}`)
	if msg != "未读到指标" {
		t.Fatalf("msg=%s", msg)
	}
	if _, msg := parseMetricsLine("no json"); msg != "未读到指标" {
		t.Fatalf("empty json msg=%s", msg)
	}
}

func TestFinishMetricsWritesSnapshot(t *testing.T) {
	svc, _ := prepareRunDB(t)
	ctx := gctx.New()
	defaultID, err := svc.projectSvc.DefaultID(ctx)
	if err != nil {
		t.Fatal(err)
	}
	runID, err := dao.ExpRun.Ctx(ctx).Data(do.ExpRun{
		Name:           "demo-metrics",
		ProjectId:      defaultID,
		ClusterId:      1,
		TeamId:         1,
		JobId:          time.Now().UnixNano(),
		TbLogdir:       "/data/hpc/home/algo/outputs/demo-metrics/tensorboard",
		OwnerUserId:    1,
		OwnerUsername:  "algo",
		OwnerNickname:  "算法",
		DatacenterCode: "cq-lj",
	}).InsertAndGetId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: runID}).Delete()
	})
	podName := fmt.Sprintf("exp-%d-metrics-0", runID)
	fake := &kube.Fake{
		AgentPods: map[string]kube.AgentWorkload{
			consts.TrainingNamespace + "/" + podName: {
				Name: podName,
				Labels: map[string]string{
					consts.LabelKeyAgentRole: agentRoleMetrics,
					consts.LabelKeyRunID:     fmt.Sprintf("%d", runID),
				},
			},
		},
		Logs: map[string]string{
			consts.TrainingNamespace + "/" + podName: `{"ok":true,"step":80,"loss":1.224,"tokensPerSec":1180000,"maxSteps":80}`,
		},
	}
	svc.finishMetrics(ctx, fake, &entity.ExpRun{Id: runID}, kube.AgentWorkload{Phase: "Succeeded"})
	var row entity.ExpRun
	if err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: runID}).Scan(&row); err != nil {
		t.Fatal(err)
	}
	if row.LastLoss != 1.224 || row.LastStep != 80 || row.LastTokensPerSec != 1180000 || row.MaxSteps != 80 {
		t.Fatalf("snapshot=%+v", row)
	}
	if row.MetricsAt == nil || row.MetricsAt.IsZero() {
		t.Fatal("metrics_at should be set")
	}
	if row.MetricsError != "" {
		t.Fatalf("metrics_error=%s", row.MetricsError)
	}
}

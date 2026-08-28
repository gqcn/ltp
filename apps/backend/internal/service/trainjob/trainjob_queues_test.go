// 本文件验证本月卡时按 GPU 数与自然月运行时长交集聚合。

package trainjob

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/gogf/gf/v2/os/gctx"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
)

func TestOverlapGPUHours(t *testing.T) {
	now := time.Date(2026, 8, 15, 12, 0, 0, 0, time.Local)
	monthStart := time.Date(2026, 8, 1, 0, 0, 0, 0, time.Local)
	started := gtime.NewFromTime(now.Add(-2 * time.Hour))
	got := overlapGPUHours(&entity.TrainJob{GpuCount: 4, StartedAt: started}, monthStart, now)
	if got != 8 {
		t.Fatalf("running hours=%v", got)
	}
	endedLastMonth := gtime.NewFromTime(monthStart.Add(-time.Hour))
	startedLastMonth := gtime.NewFromTime(monthStart.Add(-3 * time.Hour))
	got = overlapGPUHours(&entity.TrainJob{
		GpuCount:  8,
		StartedAt: startedLastMonth,
		EndedAt:   endedLastMonth,
	}, monthStart, now)
	if got != 0 {
		t.Fatalf("last month hours=%v", got)
	}
}

func TestGPUHoursMonthByQueueIDs(t *testing.T) {
	hours, err := (&serviceImpl{}).GPUHoursMonthByQueueIDs(context.Background(), 0, []int64{9})
	if err != nil || hours[9] != 0 {
		t.Fatalf("empty cluster hours=%v err=%v", hours, err)
	}
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	clusterID := time.Now().UnixNano()
	queueID := clusterID + 1
	id, err := dao.TrainJob.Ctx(ctx).Data(do.TrainJob{
		ClusterId:           clusterID,
		Name:                "hours-" + time.Now().Format("150405.000"),
		Namespace:           "maip",
		TeamId:              1,
		QueueId:             queueID,
		Nodes:               1,
		GpusPerNode:         8,
		GpuCount:            8,
		CpuPerNode:          1,
		MemGiPerNode:        1,
		Image:               "busybox",
		Command:             "sleep",
		Env:                 "{}",
		Workdir:             "/",
		OwnerUserId:         1,
		OwnerUsername:       "tester",
		SubmittedByUserId:   1,
		SubmittedByUsername: "tester",
		Status:              statusRunning,
		ConfigMounts:        "[]",
		StartedAt:           gtime.NewFromTime(time.Now().Add(-48 * time.Hour)),
	}).InsertAndGetId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = dao.TrainJob.Ctx(context.Background()).Where(do.TrainJob{Id: id}).Delete()
	})
	got, err := (&serviceImpl{}).GPUHoursMonthByQueueIDs(ctx, clusterID, []int64{queueID, queueID + 7})
	if err != nil {
		t.Fatal(err)
	}
	if got[queueID] <= 0 {
		t.Fatalf("hours=%v", got[queueID])
	}
	if got[queueID+7] != 0 {
		t.Fatalf("missing queue hours=%v", got[queueID+7])
	}
}

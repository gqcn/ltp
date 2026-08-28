// 本文件实现停止训练任务。

package trainjob

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Cancel 中止 Volcano Job 并更新业务状态；集群中 Job 不存在时仍写成 cancelled。
func (s *serviceImpl) Cancel(ctx context.Context, actor Actor, id int64) error {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return err
	}
	if !isActiveStatus(row.Status) {
		return bizerr.New(CodeNotRunning)
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	if err := client.AbortJob(ctx, consts.TrainingNamespace, row.Name); err != nil {
		return err
	}
	now := gtime.Now()
	if _, err := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{Id: id}).Data(do.TrainJob{
		Status:       statusCancelled,
		VolcanoPhase: "Aborted",
		ListBucket:   listBucketOf(statusCancelled),
		EndedAt:      now,
		SyncError:    "",
	}).Update(); err != nil {
		return gerror.Wrap(err, "update job cancelled")
	}
	logger.Infof(ctx, "cancelled train job %d", id)
	return nil
}

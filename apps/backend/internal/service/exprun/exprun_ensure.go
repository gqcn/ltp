// 本文件按训练任务幂等创建实验 Run，并为历史任务补建。

package exprun

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/trainjob"
	"github.com/gqcn/ltp/pkg/logger"
)

// EnsureForJob 按 job_id 幂等插入 Run。已删除的同一任务不再补建。
func (s *serviceImpl) EnsureForJob(ctx context.Context, in trainjob.JobLink) error {
	if in.JobID <= 0 {
		return errInvalid("任务 ID 无效")
	}
	exists, err := dao.ExpRun.Ctx(ctx).Unscoped().Where(do.ExpRun{JobId: in.JobID}).Count()
	if err != nil {
		return gerror.Wrap(err, "count exp run by job")
	}
	if exists > 0 {
		return nil
	}
	projectID, err := s.resolveProjectID(ctx, in.ProjectID)
	if err != nil {
		return err
	}
	logDir := in.LogDir
	if logDir == "" {
		logDir = "/data/hpc/home/" + in.OwnerUsername + "/outputs/" + in.Name + "/tensorboard"
	}
	_, err = dao.ExpRun.Ctx(ctx).Data(do.ExpRun{
		Name:           in.Name,
		ProjectId:      projectID,
		ClusterId:      in.ClusterID,
		TeamId:         in.TeamID,
		TeamName:       in.TeamName,
		JobId:          in.JobID,
		TbLogdir:       logDir,
		DatacenterCode: in.Datacenter,
		OwnerUserId:    in.OwnerUserID,
		OwnerUsername:  in.OwnerUsername,
		OwnerNickname:  in.OwnerNickname,
	}).InsertAndGetId()
	if err != nil {
		dup, countErr := dao.ExpRun.Ctx(ctx).Unscoped().Where(do.ExpRun{JobId: in.JobID}).Count()
		if countErr == nil && dup > 0 {
			return nil
		}
		return gerror.Wrap(err, "insert exp run")
	}
	return nil
}

// MapByJobIDs 按任务 ID 批量返回快照。
func (s *serviceImpl) MapByJobIDs(ctx context.Context, jobIDs []int64) (map[int64]trainjob.ExperimentRef, error) {
	out := map[int64]trainjob.ExperimentRef{}
	if len(jobIDs) == 0 {
		return out, nil
	}
	var rows []*entity.ExpRun
	if err := dao.ExpRun.Ctx(ctx).WhereIn(dao.ExpRun.Columns().JobId, jobIDs).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list exp runs by jobs")
	}
	for _, row := range rows {
		if row == nil || row.JobId == 0 {
			continue
		}
		out[row.JobId] = trainjob.ExperimentRef{
			ID:       row.Id,
			Name:     row.Name,
			Loss:     snapshotLoss(row),
			Step:     snapshotStep(row),
			MaxSteps: snapshotMaxSteps(row),
		}
	}
	return out, nil
}

func (s *serviceImpl) resolveProjectID(ctx context.Context, projectID int64) (int64, error) {
	if projectID <= 0 {
		return s.projectSvc.DefaultID(ctx)
	}
	if _, err := s.projectSvc.Get(ctx, projectID); err != nil {
		return 0, err
	}
	return projectID, nil
}

func (s *serviceImpl) syncMissing(ctx context.Context, clusterID int64) {
	links, err := s.jobSvc.ListJobLinksByCluster(ctx, clusterID)
	if err != nil {
		logger.Warningf(ctx, "list jobs for exp sync cluster=%d: %v", clusterID, err)
		return
	}
	if len(links) == 0 {
		return
	}
	existing := map[int64]struct{}{}
	var rows []*entity.ExpRun
	err = dao.ExpRun.Ctx(ctx).Unscoped().
		Fields(dao.ExpRun.Columns().JobId).
		Where(do.ExpRun{ClusterId: clusterID}).
		Scan(&rows)
	if err != nil {
		logger.Warningf(ctx, "list existing exp runs cluster=%d: %v", clusterID, err)
		return
	}
	for _, row := range rows {
		if row != nil && row.JobId > 0 {
			existing[row.JobId] = struct{}{}
		}
	}
	for i := range links {
		if _, ok := existing[links[i].JobID]; ok {
			continue
		}
		if err := s.EnsureForJob(ctx, links[i]); err != nil {
			logger.Warningf(ctx, "ensure exp run for job %d: %v", links[i].JobID, err)
		}
	}
}

// 本文件实现「我的队列」额度、本月卡时与活跃任务聚合。

package trainjob

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/team"
)

// ListMyQueues 返回当前用户可用队列。
func (s *serviceImpl) ListMyQueues(ctx context.Context, actor Actor, clusterID int64) (*MyQueuesOutput, error) {
	if clusterID <= 0 {
		return nil, errInvalid("请选择工作集群")
	}
	teamIDs, err := s.teamSvc.ListIDsByUserID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	queues, err := s.queueSvc.ListInCluster(ctx, clusterID, teamIDs, actor.seesAllTeams())
	if err != nil {
		return nil, err
	}
	queueIDs := make([]int64, 0, len(queues))
	for _, q := range queues {
		if q != nil {
			queueIDs = append(queueIDs, q.ID)
		}
	}
	active, err := s.activeJobsByQueue(ctx, clusterID, queueIDs)
	if err != nil {
		return nil, err
	}
	hoursByQueue, err := s.GPUHoursMonthByQueueIDs(ctx, clusterID, queueIDs)
	if err != nil {
		return nil, err
	}
	out := &MyQueuesOutput{List: make([]MyQueue, 0, len(queues))}
	for _, q := range queues {
		if q == nil {
			continue
		}
		teams := make([]team.NameRef, 0, len(q.Teams))
		for _, t := range q.Teams {
			teams = append(teams, team.NameRef{ID: t.ID, Name: t.Name})
		}
		jobs := active[q.ID]
		if jobs == nil {
			jobs = []QueueJob{}
		}
		running, pending := 0, 0
		runningHours := 0.0
		for _, j := range jobs {
			if j.Status == statusQueued {
				pending++
			} else {
				running++
				runningHours += j.GPUHours
			}
		}
		monthHours := hoursByQueue[q.ID]
		item := MyQueue{
			ID:                  q.ID,
			Name:                q.Name,
			DisplayName:         q.DisplayName,
			DatacenterCode:      q.DatacenterCode,
			DatacenterName:      q.DatacenterName,
			DatacenterShortName: q.DatacenterShortName,
			DatacenterColor:     q.DatacenterColor,
			GPUType:             q.GPUType,
			GPUQuota:            q.GPUQuota,
			GPUUsed:             q.GPUUsed,
			CPUQuota:            q.CPUQuota,
			CPUUsed:             q.CPUUsed,
			MemQuotaGi:          q.MemQuotaGi,
			MemUsedGi:           q.MemUsedGi,
			Features:            q.Features,
			Enabled:             q.Enabled,
			State:               q.State,
			SyncError:           q.SyncError,
			Teams:               teams,
			GPUHoursMonth:       monthHours,
			Running:             running,
			Pending:             pending,
			ActiveJobs:          jobs,
		}
		out.List = append(out.List, item)
		out.Summary.GPUQuota += q.GPUQuota
		out.Summary.GPUUsed += q.GPUUsed
		out.Summary.CPUQuota += q.CPUQuota
		out.Summary.CPUUsed += q.CPUUsed
		out.Summary.MemQuotaGi += q.MemQuotaGi
		out.Summary.MemUsedGi += q.MemUsedGi
		out.Summary.GPUHoursMonth += monthHours
		out.Summary.GPUHoursRunning += runningHours
		out.Summary.Running += running
		out.Summary.Pending += pending
	}
	return out, nil
}

func (s *serviceImpl) activeJobsByQueue(ctx context.Context, clusterID int64, queueIDs []int64) (map[int64][]QueueJob, error) {
	out := map[int64][]QueueJob{}
	for _, id := range queueIDs {
		out[id] = []QueueJob{}
	}
	if len(queueIDs) == 0 {
		return out, nil
	}
	var rows []*entity.TrainJob
	err := dao.TrainJob.Ctx(ctx).
		Where(do.TrainJob{ClusterId: clusterID}).
		WhereIn(dao.TrainJob.Columns().QueueId, queueIDs).
		WhereIn(dao.TrainJob.Columns().Status, []string{statusQueued, statusStarting, statusRunning}).
		OrderAsc(dao.TrainJob.Columns().ListBucket).
		OrderAsc(dao.TrainJob.Columns().PriorityOrder).
		OrderDesc(dao.TrainJob.Columns().CreatedAt).
		Limit(200).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list active jobs")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.QueueId] = append(out[row.QueueId], QueueJob{
			ID:            row.Id,
			Name:          row.Name,
			Status:        row.Status,
			Priority:      row.Priority,
			GPUCount:      row.GpuCount,
			GPUType:       row.GpuType,
			CPUTotal:      row.Nodes * row.CpuPerNode,
			MemGiTotal:    row.Nodes * row.MemGiPerNode,
			OwnerNickname: row.OwnerNickname,
			GPUHours:      gpuHours(row),
			DurationMs:    durationMs(row),
		})
	}
	return out, nil
}

func (s *serviceImpl) monthJobsByQueue(ctx context.Context, clusterID int64, queueIDs []int64) (map[int64][]*entity.TrainJob, error) {
	out := map[int64][]*entity.TrainJob{}
	for _, id := range queueIDs {
		out[id] = []*entity.TrainJob{}
	}
	if len(queueIDs) == 0 {
		return out, nil
	}
	var rows []*entity.TrainJob
	err := dao.TrainJob.Ctx(ctx).
		Where(do.TrainJob{ClusterId: clusterID}).
		WhereIn(dao.TrainJob.Columns().QueueId, queueIDs).
		WhereNot(dao.TrainJob.Columns().Status, statusQueued).
		Limit(1000).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list month jobs")
	}
	for _, row := range rows {
		if row == nil || row.StartedAt == nil {
			continue
		}
		out[row.QueueId] = append(out[row.QueueId], row)
	}
	return out, nil
}

// GPUHoursMonthByQueueIDs 按队列批量返回本月卡时。
func (s *serviceImpl) GPUHoursMonthByQueueIDs(ctx context.Context, clusterID int64, queueIDs []int64) (map[int64]float64, error) {
	out := make(map[int64]float64, len(queueIDs))
	for _, id := range queueIDs {
		out[id] = 0
	}
	if clusterID <= 0 || len(queueIDs) == 0 {
		return out, nil
	}
	jobs, err := s.monthJobsByQueue(ctx, clusterID, queueIDs)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	for id, rows := range jobs {
		sum := 0.0
		for _, row := range rows {
			sum += overlapGPUHours(row, monthStart, now)
		}
		out[id] = sum
	}
	return out, nil
}

func overlapGPUHours(row *entity.TrainJob, monthStart, now time.Time) float64 {
	if row.StartedAt == nil || row.StartedAt.IsZero() {
		return 0
	}
	start := row.StartedAt.Time
	end := now
	if row.EndedAt != nil && !row.EndedAt.IsZero() {
		end = row.EndedAt.Time
	}
	if end.Before(monthStart) || start.After(now) {
		return 0
	}
	if start.Before(monthStart) {
		start = monthStart
	}
	if end.After(now) {
		end = now
	}
	hours := end.Sub(start).Hours()
	if hours < 0 {
		return 0
	}
	return float64(row.GpuCount) * hours
}

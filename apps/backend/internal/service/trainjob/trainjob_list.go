// 本文件实现训练任务列表、详情与可见性。

package trainjob

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// List 筛选分页任务并刷新 Volcano 相位。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	if in.ClusterID <= 0 {
		return nil, errInvalid("请选择工作集群")
	}
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod, err := s.listModel(ctx, in)
	if err != nil {
		return nil, err
	}
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count jobs")
	}
	var rows []*entity.TrainJob
	if err := mod.
		OrderAsc(dao.TrainJob.Columns().ListBucket).
		OrderAsc(dao.TrainJob.Columns().PriorityOrder).
		OrderDesc(dao.TrainJob.Columns().CreatedAt).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list jobs")
	}
	if err := s.refreshPhases(ctx, in.ClusterID, rows); err != nil {
		logger.Warningf(ctx, "refresh job phases: %v", err)
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			items = append(items, toItem(row, false))
		}
	}
	return &ListOutput{List: items, Total: total}, nil
}

// Get 返回任务详情。
func (s *serviceImpl) Get(ctx context.Context, actor Actor, id int64) (*Item, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	_ = s.refreshPhases(ctx, row.ClusterId, []*entity.TrainJob{row})
	row, err = s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	return toItem(row, true), nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) (*gdb.Model, error) {
	cols := dao.TrainJob.Columns()
	mod := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{ClusterId: in.ClusterID})
	if !in.Actor.IsAdmin {
		teamIDs, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if len(teamIDs) == 0 {
			return mod.Where("1=0"), nil
		}
		mod = mod.WhereIn(cols.TeamId, teamIDs)
	}
	if in.TeamID > 0 {
		mod = mod.Where(do.TrainJob{TeamId: in.TeamID})
	}
	if in.QueueID > 0 {
		mod = mod.Where(do.TrainJob{QueueId: in.QueueID})
	}
	if st := strings.TrimSpace(in.Status); st != "" && st != "all" {
		mod = mod.Where(do.TrainJob{Status: st})
	}
	if p := strings.TrimSpace(in.Priority); p != "" && p != "all" {
		mod = mod.Where(do.TrainJob{Priority: p})
	}
	if node := strings.TrimSpace(in.Node); node != "" {
		mod = mod.WhereLike(cols.PodNodes, "%"+node+"%")
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword != "" {
		pattern := "%" + keyword + "%"
		mod = mod.Where(mod.Builder().
			WhereLike(cols.Name, pattern).
			WhereOrLike(cols.OwnerUsername, pattern).
			WhereOrLike(cols.OwnerNickname, pattern).
			WhereOrLike(cols.TeamName, pattern).
			WhereOrLike(cols.QueueName, pattern).
			WhereOrLike(cols.QueueDisplayName, pattern))
	}
	return mod, nil
}

func (s *serviceImpl) mustVisible(ctx context.Context, actor Actor, id int64) (*entity.TrainJob, error) {
	var row *entity.TrainJob
	if err := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{Id: id}).Scan(&row); err != nil {
		return nil, gerror.Wrap(err, "get train job")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	if actor.IsAdmin {
		return row, nil
	}
	ids, err := s.teamSvc.ListIDsByUserID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	if !containsID(ids, row.TeamId) {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

func (s *serviceImpl) refreshPhases(ctx context.Context, clusterID int64, rows []*entity.TrainJob) error {
	if len(rows) == 0 {
		return nil
	}
	client, err := s.clusterSvc.Client(ctx, clusterID)
	if err != nil {
		for _, row := range rows {
			if row != nil {
				row.SyncError = "集群不可达"
			}
		}
		return err
	}
	jobs, err := client.ListJobs(ctx, consts.TrainingNamespace)
	if err != nil {
		for _, row := range rows {
			if row != nil {
				row.SyncError = "找不到对应的 Volcano Job"
			}
		}
		return err
	}
	byName := map[string]string{}
	byUID := map[string]string{}
	for _, job := range jobs {
		if job == nil {
			continue
		}
		byName[job.Name] = job.Phase
		byUID[job.Name] = job.UID
	}
	now := gtime.Now()
	for _, row := range rows {
		if row == nil {
			continue
		}
		phase, ok := byName[row.Name]
		if !ok {
			row.SyncError = "找不到对应的 Volcano Job"
			continue
		}
		row.SyncError = ""
		row.VolcanoPhase = phase
		if uid := byUID[row.Name]; uid != "" {
			row.VolcanoUid = uid
		}
		status := mapVolcanoPhase(phase)
		row.Status = status
		data := do.TrainJob{
			Status:        status,
			VolcanoPhase:  phase,
			SyncError:     "",
			VolcanoUid:    row.VolcanoUid,
			ListBucket:    listBucketOf(status),
			PriorityOrder: priorityOrderOf(row.Priority),
		}
		if isActiveStatus(status) && row.StartedAt == nil && status != statusQueued {
			row.StartedAt = now
			data.StartedAt = now
		}
		if !isActiveStatus(status) && row.EndedAt == nil {
			row.EndedAt = now
			data.EndedAt = now
		}
		if _, err := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{Id: row.Id}).Data(data).Update(); err != nil {
			logger.Warningf(ctx, "update job phase %d: %v", row.Id, err)
		}
	}
	return nil
}

func toItem(row *entity.TrainJob, withSpec bool) *Item {
	item := &Item{
		ID:                  row.Id,
		ClusterID:           row.ClusterId,
		Name:                row.Name,
		Namespace:           row.Namespace,
		Status:              row.Status,
		Priority:            row.Priority,
		TeamID:              row.TeamId,
		TeamName:            row.TeamName,
		QueueID:             row.QueueId,
		QueueName:           row.QueueName,
		QueueDisplayName:    row.QueueDisplayName,
		DatacenterCode:      row.DatacenterCode,
		GPUType:             row.GpuType,
		RequireIB:           row.RequireIb,
		Nodes:               row.Nodes,
		GpusPerNode:         row.GpusPerNode,
		GPUCount:            row.GpuCount,
		CPUPerNode:          row.CpuPerNode,
		MemGiPerNode:        row.MemGiPerNode,
		OwnerUsername:       row.OwnerUsername,
		OwnerNickname:       row.OwnerNickname,
		SubmittedByUsername: row.SubmittedByUsername,
		SubmittedByNickname: row.SubmittedByNickname,
		SyncError:           row.SyncError,
		FailReason:          row.FailReason,
		RerunFromID:         row.RerunFromId,
		PodNodes:            row.PodNodes,
		CreatedAt:           model.UnixMilli(row.CreatedAt),
		StartedAt:           model.UnixMilli(row.StartedAt),
		EndedAt:             model.UnixMilli(row.EndedAt),
		Env:                 []EnvEntry{},
		Mounts:              []Mount{},
	}
	item.DurationMs = durationMs(row)
	item.GPUHours = gpuHours(row)
	if withSpec {
		item.Image = row.Image
		item.Command = row.Command
		item.Workdir = row.Workdir
		item.Env = decodeEnv(row.Env)
		item.Mounts = decodeMounts(row.ConfigMounts)
	}
	return item
}

func durationMs(row *entity.TrainJob) int64 {
	if row.StartedAt == nil || row.StartedAt.IsZero() {
		return 0
	}
	end := time.Now()
	if row.EndedAt != nil && !row.EndedAt.IsZero() {
		end = row.EndedAt.Time
	}
	d := end.Sub(row.StartedAt.Time)
	if d < 0 {
		return 0
	}
	return d.Milliseconds()
}

func gpuHours(row *entity.TrainJob) float64 {
	if row.Status == statusQueued {
		return 0
	}
	ms := durationMs(row)
	if ms <= 0 {
		return 0
	}
	return float64(row.GpuCount) * (float64(ms) / 3600000.0)
}

func decodeEnv(raw string) []EnvEntry {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []EnvEntry{}
	}
	var obj map[string]string
	if err := json.Unmarshal([]byte(raw), &obj); err != nil {
		return []EnvEntry{}
	}
	out := make([]EnvEntry, 0, len(obj))
	for k, v := range obj {
		out = append(out, EnvEntry{Key: k, Value: v})
	}
	return out
}

func decodeMounts(raw string) []Mount {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []Mount{}
	}
	var out []Mount
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []Mount{}
	}
	if out == nil {
		return []Mount{}
	}
	return out
}

func normalizePage(pageNum, pageSize int) (int, int) {
	if pageNum < defaultListNum {
		pageNum = defaultListNum
	}
	if pageSize < 1 {
		pageSize = defaultPageSz
	}
	if pageSize > maxListSize {
		pageSize = maxListSize
	}
	return pageNum, pageSize
}

func containsID(ids []int64, want int64) bool {
	for _, id := range ids {
		if id == want {
			return true
		}
	}
	return false
}

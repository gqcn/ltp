// 本文件实现 Run 列表、详情、对比与可见性。

package exprun

import (
	"context"
	"fmt"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/trainjob"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// List 筛选分页 Run。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	if in.ClusterID <= 0 {
		return nil, errInvalid("请选择工作集群")
	}
	s.syncMissing(ctx, in.ClusterID)
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod, err := s.listModel(ctx, in)
	if err != nil {
		return nil, err
	}
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count exp runs")
	}
	var rows []*entity.ExpRun
	if err := applyRunSort(mod, in.Sort).Page(pageNum, pageSize).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list exp runs")
	}
	items, err := s.projectRuns(ctx, rows)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total}, nil
}

// Get 返回详情。
func (s *serviceImpl) Get(ctx context.Context, actor Actor, id int64) (*Item, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	items, err := s.projectRuns(ctx, []*entity.ExpRun{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return items[0], nil
}

// Compare 对比 2 至 5 条 Run。
func (s *serviceImpl) Compare(ctx context.Context, actor Actor, ids []int64) (*CompareOutput, error) {
	if len(ids) < minCompareRuns {
		return nil, errInvalid("请至少选择 2 个实验")
	}
	if len(ids) > maxCompareRuns {
		return nil, errInvalid("最多对比 5 个实验")
	}
	runs := make([]*Item, 0, len(ids))
	for _, id := range ids {
		item, err := s.Get(ctx, actor, id)
		if err != nil {
			return nil, err
		}
		runs = append(runs, item)
	}
	same := true
	for _, item := range runs[1:] {
		if item.ClusterID != runs[0].ClusterID || item.DatacenterCode != runs[0].DatacenterCode {
			same = false
			break
		}
	}
	return &CompareOutput{Runs: runs, Fields: compareFields(runs), SameLocation: same}, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) (*gdb.Model, error) {
	cols := dao.ExpRun.Columns()
	mod := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{ClusterId: in.ClusterID})
	if !in.Actor.seesAllTeams() {
		teamIDs, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if len(teamIDs) == 0 {
			return mod.Where(dao.ExpRun.Columns().Id, int64(-1)), nil
		}
		mod = mod.WhereIn(cols.TeamId, teamIDs)
	}
	if in.ProjectID > 0 {
		mod = mod.Where(do.ExpRun{ProjectId: in.ProjectID})
	}
	if kw := strings.TrimSpace(in.Keyword); kw != "" {
		like := "%" + kw + "%"
		mod = mod.Wheref(
			"("+cols.Name+" LIKE ? OR "+cols.OwnerUsername+" LIKE ? OR "+cols.OwnerNickname+" LIKE ?)",
			like, like, like,
		)
	}
	if owner := strings.TrimSpace(in.Owner); owner != "" && owner != "all" {
		mod = mod.Where(do.ExpRun{OwnerUsername: owner})
	}
	if st := normalizeJobStatus(in.Status); st != "" {
		mod = mod.Wheref(cols.JobId+" IN (SELECT id FROM train_job WHERE status = ? AND deleted_at IS NULL)", st)
	}
	return mod, nil
}

func normalizeJobStatus(status string) string {
	switch linkedJobStatus(strings.TrimSpace(status)) {
	case linkedQueued, linkedStarting, linkedRunning, linkedSuccess, linkedFailed, linkedCancelled:
		return status
	default:
		return ""
	}
}

func applyRunSort(mod *gdb.Model, sort string) *gdb.Model {
	cols := dao.ExpRun.Columns()
	switch sort {
	case sortCreatedDesc:
		return mod.OrderDesc(cols.CreatedAt)
	case sortLossAsc:
		return mod.OrderAsc(cols.LastLoss).OrderDesc(cols.UpdatedAt)
	case sortLossDesc:
		return mod.OrderDesc(cols.LastLoss).OrderDesc(cols.UpdatedAt)
	default:
		return mod.OrderDesc(cols.UpdatedAt)
	}
}

func (s *serviceImpl) mustVisible(ctx context.Context, actor Actor, id int64) (*entity.ExpRun, error) {
	var row entity.ExpRun
	if err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: id}).Scan(&row); err != nil {
		return nil, gerror.Wrap(err, "get exp run")
	}
	if row.Id == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	if actor.seesAllTeams() {
		return &row, nil
	}
	ids, err := s.teamSvc.ListIDsByUserID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	for _, teamID := range ids {
		if teamID == row.TeamId {
			return &row, nil
		}
	}
	return nil, bizerr.New(CodeNotFound)
}

func (s *serviceImpl) projectRuns(ctx context.Context, rows []*entity.ExpRun) ([]*Item, error) {
	out := make([]*Item, 0, len(rows))
	jobIDs := make([]int64, 0, len(rows))
	projectIDs := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		if row.JobId > 0 {
			jobIDs = append(jobIDs, row.JobId)
		}
		projectIDs = append(projectIDs, row.ProjectId)
	}
	jobs, err := s.jobSvc.MapByIDs(ctx, jobIDs)
	if err != nil {
		return nil, err
	}
	projects := map[int64]string{}
	if len(projectIDs) > 0 {
		var prows []*entity.ExpProject
		if err := dao.ExpProject.Ctx(ctx).WhereIn(dao.ExpProject.Columns().Id, projectIDs).Scan(&prows); err != nil {
			return nil, gerror.Wrap(err, "list exp projects for runs")
		}
		for _, p := range prows {
			name := p.DisplayName
			if name == "" {
				name = p.Name
			}
			projects[p.Id] = name
		}
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, toRunItem(row, projects[row.ProjectId], jobs[row.JobId]))
	}
	return out, nil
}

func toRunItem(row *entity.ExpRun, projectName string, job *trainjob.Item) *Item {
	item := &Item{
		ID:             row.Id,
		Name:           row.Name,
		ProjectID:      row.ProjectId,
		ProjectName:    projectName,
		ClusterID:      row.ClusterId,
		TeamID:         row.TeamId,
		TeamName:       row.TeamName,
		JobID:          row.JobId,
		DatacenterCode: row.DatacenterCode,
		TbLogdir:       row.TbLogdir,
		OwnerUsername:  row.OwnerUsername,
		OwnerNickname:  row.OwnerNickname,
		Loss:           snapshotLoss(row),
		Step:           snapshotStep(row),
		MaxSteps:       snapshotMaxSteps(row),
		TokensPerSec:   snapshotTPS(row),
		MetricsAt:      model.UnixMilli(row.MetricsAt),
		MetricsError:   row.MetricsError,
		CreatedAt:      model.UnixMilli(row.CreatedAt),
		UpdatedAt:      model.UnixMilli(row.UpdatedAt),
	}
	if job != nil {
		item.JobName = job.Name
		item.JobStatus = job.Status
		item.Image = job.Image
		item.Command = job.Command
		item.Workdir = job.Workdir
		item.Nodes = job.Nodes
		item.GpusPerNode = job.GpusPerNode
		item.GPUCount = job.GPUCount
		item.Env = job.Env
	}
	return item
}

func compareFields(runs []*Item) []CompareField {
	keys := []string{"image", "nodes", "gpusPerNode", "gpuCount", "workdir", "datacenter"}
	out := make([]CompareField, 0, len(keys))
	for _, key := range keys {
		vals := make([]string, 0, len(runs))
		for _, run := range runs {
			vals = append(vals, fieldValue(run, key))
		}
		same := true
		for _, v := range vals[1:] {
			if v != vals[0] {
				same = false
				break
			}
		}
		out = append(out, CompareField{Key: key, Values: vals, Same: same})
	}
	return out
}

func fieldValue(item *Item, key string) string {
	switch key {
	case "image":
		return item.Image
	case "nodes":
		return fmt.Sprintf("%d", item.Nodes)
	case "gpusPerNode":
		return fmt.Sprintf("%d", item.GpusPerNode)
	case "gpuCount":
		return fmt.Sprintf("%d", item.GPUCount)
	case "workdir":
		return item.Workdir
	case "datacenter":
		return item.DatacenterCode
	default:
		return ""
	}
}

func snapshotLoss(row *entity.ExpRun) *float64 {
	if row.MetricsAt == nil || row.MetricsAt.IsZero() {
		return nil
	}
	v := row.LastLoss
	return &v
}

func snapshotStep(row *entity.ExpRun) *int64 {
	if row.MetricsAt == nil || row.MetricsAt.IsZero() {
		return nil
	}
	v := row.LastStep
	return &v
}

func snapshotMaxSteps(row *entity.ExpRun) *int64 {
	if row.MaxSteps <= 0 {
		return nil
	}
	v := row.MaxSteps
	return &v
}

func snapshotTPS(row *entity.ExpRun) *float64 {
	if row.MetricsAt == nil || row.MetricsAt.IsZero() {
		return nil
	}
	v := row.LastTokensPerSec
	return &v
}

func normalizePage(pageNum, pageSize int) (int, int) {
	if pageNum < defaultListNum {
		pageNum = defaultListNum
	}
	if pageSize <= 0 {
		pageSize = defaultPageSz
	}
	if pageSize > maxListSize {
		pageSize = maxListSize
	}
	return pageNum, pageSize
}

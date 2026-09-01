// 本文件实现实验项目列表、详情与默认项目解析。

package expproject

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// List 返回项目及当前集群可见 Run 计数。
func (s *serviceImpl) List(ctx context.Context, in ListInput) ([]*Item, error) {
	var rows []*entity.ExpProject
	err := dao.ExpProject.Ctx(ctx).OrderAsc(dao.ExpProject.Columns().Id).Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list exp projects")
	}
	counts, err := s.runCounts(ctx, in)
	if err != nil {
		return nil, err
	}
	out := make([]*Item, 0, len(rows))
	for _, row := range rows {
		out = append(out, projectItem(row, counts[row.Id]))
	}
	return out, nil
}

// Get 返回单条项目。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	return projectItem(row, 0), nil
}

// DefaultID 返回 Seed 默认项目 ID。
func (s *serviceImpl) DefaultID(ctx context.Context) (int64, error) {
	var row entity.ExpProject
	err := dao.ExpProject.Ctx(ctx).Where(do.ExpProject{Name: DefaultName}).Scan(&row)
	if err != nil {
		return 0, gerror.Wrap(err, "get default exp project")
	}
	if row.Id == 0 {
		return 0, bizerr.New(CodeNotFound)
	}
	return row.Id, nil
}

func projectItem(row *entity.ExpProject, runCount int) *Item {
	display := row.DisplayName
	if display == "" {
		display = row.Name
	}
	return &Item{
		ID:          row.Id,
		Name:        row.Name,
		DisplayName: display,
		Description: row.Description,
		RunCount:    runCount,
		CreatedAt:   model.UnixMilli(row.CreatedAt),
		UpdatedAt:   model.UnixMilli(row.UpdatedAt),
	}
}

type countRow struct {
	ProjectID int64 `orm:"project_id"`
	Count     int   `orm:"count"`
}

func (s *serviceImpl) runCounts(ctx context.Context, in ListInput) (map[int64]int, error) {
	mod := dao.ExpRun.Ctx(ctx).Fields(dao.ExpRun.Columns().ProjectId + " as project_id, count(1) as count").
		Where(do.ExpRun{ClusterId: in.ClusterID}).
		Group(dao.ExpRun.Columns().ProjectId)
	if !in.Actor.seesAllTeams() {
		ids, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if len(ids) == 0 {
			return map[int64]int{}, nil
		}
		mod = mod.WhereIn(dao.ExpRun.Columns().TeamId, ids)
	}
	var rows []countRow
	if err := mod.Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "count exp runs by project")
	}
	out := map[int64]int{}
	for _, row := range rows {
		out[row.ProjectID] = row.Count
	}
	return out, nil
}

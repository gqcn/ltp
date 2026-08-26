// 本文件实现数据中心列表与详情查询，并批量装配关联计数。

package datacenter

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// List 返回经过筛选、排序和分页的数据中心列表。
// 按创建顺序（id 升序）排列。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum := in.PageNum
	pageSize := in.PageSize
	if pageNum < 1 {
		pageNum = defaultListNum
	}
	if pageSize < 1 {
		pageSize = defaultPageSz
	}
	if pageSize > maxListSize {
		pageSize = maxListSize
	}

	mod := s.listModel(ctx, in)
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count datacenters")
	}

	var rows []*entity.OpsDatacenter
	if err := s.listModel(ctx, in).
		OrderAsc(dao.OpsDatacenter.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list datacenters")
	}

	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	summary, err := s.summary(ctx)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total, Summary: summary}, nil
}

func (s *serviceImpl) summary(ctx context.Context) (Summary, error) {
	total, err := dao.OpsDatacenter.Ctx(ctx).Count()
	if err != nil {
		return Summary{}, gerror.Wrap(err, "count all datacenters")
	}
	enabled, err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Enabled: true}).Count()
	if err != nil {
		return Summary{}, gerror.Wrap(err, "count enabled datacenters")
	}
	return Summary{
		Total:    total,
		Enabled:  enabled,
		Disabled: total - enabled,
	}, nil
}

// Get 按 ID 返回数据中心；不存在时返回 CodeNotFound。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	items, err := s.projectItems(ctx, []*entity.OpsDatacenter{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return items[0], nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.OpsDatacenter.Columns()
	mod := dao.OpsDatacenter.Ctx(ctx)
	if in.Enabled != nil {
		mod = mod.Where(do.OpsDatacenter{Enabled: *in.Enabled})
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword != "" {
		pattern := "%" + keyword + "%"
		mod = mod.Where(
			mod.Builder().
				WhereLike(cols.Code, pattern).
				WhereOrLike(cols.Name, pattern).
				WhereOrLike(cols.ShortName, pattern).
				WhereOrLike(cols.Region, pattern).
				WhereOrLike(cols.Description, pattern),
		)
	}
	return mod
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.OpsDatacenter, error) {
	var row *entity.OpsDatacenter
	err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get datacenter")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

func (s *serviceImpl) projectItems(ctx context.Context, rows []*entity.OpsDatacenter) ([]*Item, error) {
	codes := make([]string, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		codes = append(codes, row.Code)
	}
	stats, err := s.usage.CountByCodes(ctx, codes)
	if err != nil {
		return nil, gerror.Wrap(err, "count datacenter usage")
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, toItem(row, stats[row.Code]))
	}
	return items, nil
}

func toItem(row *entity.OpsDatacenter, usage UsageStats) *Item {
	return &Item{
		ID:          row.Id,
		Code:        row.Code,
		Name:        row.Name,
		ShortName:   row.ShortName,
		Region:      row.Region,
		LabelKey:    consts.LabelKeyDatacenter,
		Label:       buildLabel(row.Code),
		Color:       row.Color,
		Description: row.Description,
		Enabled:     row.Enabled,
		IsDefault:   row.IsDefault,
		Usage:       usage,
		CreatedAt:   model.UnixMilli(row.CreatedAt),
		UpdatedAt:   model.UnixMilli(row.UpdatedAt),
	}
}

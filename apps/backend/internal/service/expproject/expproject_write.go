// 本文件实现实验项目的创建、名称与描述更新、删除。

package expproject

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// Create 创建项目。
func (s *serviceImpl) Create(ctx context.Context, actor Actor, name, desc string) (int64, error) {
	_ = actor
	name = normalizeName(name)
	desc = normalizeDesc(desc)
	if name == "" {
		return 0, errInvalid("请填写项目名称")
	}
	if utf8.RuneCountInString(name) > maxNameLen {
		return 0, errInvalid("项目名称最长 64 个字符")
	}
	if utf8.RuneCountInString(desc) > maxDescLen {
		return 0, errInvalid("描述最长 256 个字符")
	}
	dup, err := s.activeNameExists(ctx, name, 0)
	if err != nil {
		return 0, err
	}
	if dup {
		return 0, bizerr.New(CodeNameExists)
	}
	id, err := dao.ExpProject.Ctx(ctx).Data(do.ExpProject{
		Name:        name,
		DisplayName: name,
		Description: desc,
		Archived:    false,
	}).InsertAndGetId()
	if err != nil {
		return 0, gerror.Wrap(err, "insert exp project")
	}
	return id, nil
}

// Update 更新名称与描述。默认项目只更新描述。
func (s *serviceImpl) Update(ctx context.Context, actor Actor, id int64, name, desc string) error {
	_ = actor
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	desc = normalizeDesc(desc)
	if utf8.RuneCountInString(desc) > maxDescLen {
		return errInvalid("描述最长 256 个字符")
	}
	name = normalizeName(name)
	if strings.EqualFold(row.Name, DefaultName) {
		if name != "" && !strings.EqualFold(name, DefaultName) {
			return errInvalid("默认项目名称不可改")
		}
		if _, err := dao.ExpProject.Ctx(ctx).Where(do.ExpProject{Id: id}).Data(do.ExpProject{Description: desc}).Update(); err != nil {
			return gerror.Wrap(err, "update exp project")
		}
		return nil
	}
	if name == "" {
		return errInvalid("请填写项目名称")
	}
	if utf8.RuneCountInString(name) > maxNameLen {
		return errInvalid("项目名称最长 64 个字符")
	}
	dup, err := s.activeNameExists(ctx, name, id)
	if err != nil {
		return err
	}
	if dup {
		return bizerr.New(CodeNameExists)
	}
	if _, err := dao.ExpProject.Ctx(ctx).Where(do.ExpProject{Id: id}).Data(do.ExpProject{
		Name:        name,
		DisplayName: name,
		Description: desc,
	}).Update(); err != nil {
		return gerror.Wrap(err, "update exp project")
	}
	return nil
}

// Delete 软删除非默认项目，并把其下 Run 改挂到默认项目。
func (s *serviceImpl) Delete(ctx context.Context, actor Actor, id int64) error {
	_ = actor
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	if strings.EqualFold(row.Name, DefaultName) {
		return errInvalid("默认项目不可删除")
	}
	defaultID, err := s.DefaultID(ctx)
	if err != nil {
		return err
	}
	return dao.ExpProject.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{ProjectId: id}).Data(do.ExpRun{ProjectId: defaultID}).Update(); err != nil {
			return gerror.Wrap(err, "reassign exp runs")
		}
		if _, err := dao.ExpProject.Ctx(ctx).Where(do.ExpProject{Id: id}).Delete(); err != nil {
			return gerror.Wrap(err, "delete exp project")
		}
		return nil
	})
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.ExpProject, error) {
	var row entity.ExpProject
	err := dao.ExpProject.Ctx(ctx).Where(do.ExpProject{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get exp project")
	}
	if row.Id == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return &row, nil
}

func (s *serviceImpl) activeNameExists(ctx context.Context, name string, excludeID int64) (bool, error) {
	mod := dao.ExpProject.Ctx(ctx)
	if excludeID > 0 {
		mod = mod.WhereNot(dao.ExpProject.Columns().Id, excludeID)
	}
	var rows []*entity.ExpProject
	if err := mod.Scan(&rows); err != nil {
		return false, gerror.Wrap(err, "list exp projects")
	}
	want := strings.ToLower(name)
	for _, row := range rows {
		if strings.ToLower(row.Name) == want {
			return true, nil
		}
	}
	return false, nil
}

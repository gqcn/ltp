// 本文件实现数据中心创建、更新、启停与删除。

package datacenter

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Create 插入一条启用的非默认数据中心并返回 ID。
func (s *serviceImpl) Create(ctx context.Context, in CreateInput) (int64, error) {
	code := normalizeCode(in.Code)
	name := normalizeName(in.Name)
	shortName := normalizeName(in.ShortName)
	if err := validateRequiredText(code, name, shortName); err != nil {
		return 0, err
	}
	if err := validateCode(code); err != nil {
		return 0, err
	}
	exists, err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Code: code}).Count()
	if err != nil {
		return 0, gerror.Wrap(err, "check datacenter code")
	}
	if exists > 0 {
		return 0, bizerr.New(CodeCodeExists)
	}
	id, err := dao.OpsDatacenter.Ctx(ctx).Data(do.OpsDatacenter{
		Code:        code,
		Name:        name,
		ShortName:   shortName,
		Region:      strings.TrimSpace(in.Region),
		LabelKey:    consts.LabelKeyDatacenter,
		Color:       normalizeColor(in.Color),
		Description: strings.TrimSpace(in.Description),
		Enabled:     true,
		IsDefault:   false,
	}).InsertAndGetId()
	if err != nil {
		return 0, gerror.Wrap(err, "create datacenter")
	}
	logger.Infof(ctx, "created datacenter %s id=%d", code, id)
	return id, nil
}

// Update 修改展示元数据。标识与默认标记不可改。
func (s *serviceImpl) Update(ctx context.Context, in UpdateInput) error {
	row, err := s.mustGet(ctx, in.ID)
	if err != nil {
		return err
	}
	name := normalizeName(in.Name)
	shortName := normalizeName(in.ShortName)
	if err := validateRequiredText(row.Code, name, shortName); err != nil {
		return err
	}
	if _, err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Id: in.ID}).Data(do.OpsDatacenter{
		Name:        name,
		ShortName:   shortName,
		Region:      strings.TrimSpace(in.Region),
		LabelKey:    consts.LabelKeyDatacenter,
		Color:       normalizeColor(in.Color),
		Description: strings.TrimSpace(in.Description),
	}).Update(); err != nil {
		return gerror.Wrap(err, "update datacenter")
	}
	return nil
}

// UpdateStatus 启用或停用非默认数据中心。
func (s *serviceImpl) UpdateStatus(ctx context.Context, id int64, enabled bool) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	if row.IsDefault && !enabled {
		return bizerr.New(CodeDefaultProtected, bizerr.P("message", "默认数据中心始终启用，不可停用"))
	}
	if _, err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Id: id}).Data(do.OpsDatacenter{
		Enabled: enabled,
	}).Update(); err != nil {
		return gerror.Wrap(err, "update datacenter status")
	}
	return nil
}

// Delete 软删除非默认数据中心。
func (s *serviceImpl) Delete(ctx context.Context, id int64) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	if row.IsDefault {
		return bizerr.New(CodeDefaultProtected, bizerr.P("message", "默认数据中心不可删除"))
	}
	if _, err := dao.OpsDatacenter.Ctx(ctx).Where(do.OpsDatacenter{Id: id}).Delete(); err != nil {
		return gerror.Wrap(err, "delete datacenter")
	}
	logger.Infof(ctx, "deleted datacenter %s id=%d", row.Code, id)
	return nil
}

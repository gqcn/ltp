// 本文件实现角色列表与按编码读取。

package role

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type roleCountRow struct {
	RoleCode string `orm:"role_code"` // 角色编码
	Count    int    `orm:"count"`     // 用户数
}

// List 返回内置角色并批量装配用户数。
func (s *serviceImpl) List(ctx context.Context) ([]*Item, error) {
	var rows []*entity.SysRole
	err := dao.SysRole.Ctx(ctx).OrderAsc(dao.SysRole.Columns().Id).Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list roles")
	}
	counts, err := countUsersByRole(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		item := toItem(row)
		item.UserCount = counts[string(item.Code)]
		out = append(out, item)
	}
	return out, nil
}

// GetByCode 按编码读取角色。
func (s *serviceImpl) GetByCode(ctx context.Context, code Code) (*Item, error) {
	if _, ok := ParseCode(string(code)); !ok {
		return nil, bizerr.New(CodeNotFound)
	}
	var row *entity.SysRole
	err := dao.SysRole.Ctx(ctx).Where(do.SysRole{Code: string(code)}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get role")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return toItem(row), nil
}

func countUsersByRole(ctx context.Context) (map[string]int, error) {
	var rows []roleCountRow
	err := dao.SysUser.Ctx(ctx).
		Fields(dao.SysUser.Columns().RoleCode+" as role_code, count(1) as count").
		Where(dao.SysUser.Columns().RoleCode+" <> ?", "").
		Group(dao.SysUser.Columns().RoleCode).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "count users by role")
	}
	out := make(map[string]int, len(rows))
	for _, row := range rows {
		out[row.RoleCode] = row.Count
	}
	return out, nil
}

func toItem(row *entity.SysRole) *Item {
	code, _ := ParseCode(row.Code)
	return &Item{
		ID:          row.Id,
		Code:        code,
		Name:        row.Name,
		Description: row.Description,
		Menus:       parseMenus(row.Menus),
		Builtin:     row.Builtin,
		UpdatedBy:   row.UpdatedBy,
		UpdatedAt:   model.UnixMilli(row.UpdatedAt),
	}
}

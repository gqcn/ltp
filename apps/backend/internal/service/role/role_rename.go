// 本文件实现角色改名。

package role

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Rename 修改角色显示名称。
func (s *serviceImpl) Rename(ctx context.Context, id int64, name string, updatedBy string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请输入角色名称"))
	}
	if len([]rune(name)) > maxRoleNameLen {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "角色名称不超过 32 个字符"))
	}
	var row *entity.SysRole
	err := dao.SysRole.Ctx(ctx).Where(do.SysRole{Id: id}).Scan(&row)
	if err != nil {
		return gerror.Wrap(err, "get role")
	}
	if row == nil {
		return bizerr.New(CodeNotFound)
	}
	var dup *entity.SysRole
	err = dao.SysRole.Ctx(ctx).Where(do.SysRole{Name: name}).WhereNot(dao.SysRole.Columns().Id, id).Scan(&dup)
	if err != nil {
		return gerror.Wrap(err, "check role name")
	}
	if dup != nil {
		return bizerr.New(CodeNameExists)
	}
	if _, err := dao.SysRole.Ctx(ctx).Where(do.SysRole{Id: id}).Data(do.SysRole{
		Name:      name,
		UpdatedBy: strings.TrimSpace(updatedBy),
	}).Update(); err != nil {
		return gerror.Wrap(err, "rename role")
	}
	logger.Infof(ctx, "role %s renamed to %s", row.Code, name)
	return nil
}

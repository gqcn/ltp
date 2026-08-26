// 本文件实现平台用户启停、角色授权与移除。

package user

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// UpdateStatus 批量启用或停用平台用户。
func (s *serviceImpl) UpdateStatus(ctx context.Context, ids []int64, enabled bool) (int, error) {
	ids, err := normalizeIDs(ids)
	if err != nil {
		return 0, err
	}
	rows, err := s.loadLDAPUsers(ctx, ids)
	if err != nil {
		return 0, err
	}
	target := auth.UserStatusDisabled
	if enabled {
		target = auth.UserStatusEnabled
	}
	updated := 0
	for _, row := range rows {
		if auth.UserStatus(row.Status) == target {
			continue
		}
		if _, err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Id: row.Id}).Data(do.SysUser{
			Status: int(target),
		}).Update(); err != nil {
			return updated, gerror.Wrap(err, "update user status")
		}
		updated++
	}
	logger.Infof(ctx, "updated status of %d users enabled=%v", updated, enabled)
	return updated, nil
}

// UpdateRole 批量为用户指定内置角色。
func (s *serviceImpl) UpdateRole(ctx context.Context, ids []int64, roleCode role.Code) (int, error) {
	if _, ok := role.ParseCode(string(roleCode)); !ok {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请选择角色"))
	}
	if _, err := s.roleSvc.GetByCode(ctx, roleCode); err != nil {
		return 0, err
	}
	ids, err := normalizeIDs(ids)
	if err != nil {
		return 0, err
	}
	rows, err := s.loadLDAPUsers(ctx, ids)
	if err != nil {
		return 0, err
	}
	updated := 0
	for _, row := range rows {
		if _, err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Id: row.Id}).Data(do.SysUser{
			RoleCode: string(roleCode),
		}).Update(); err != nil {
			return updated, gerror.Wrap(err, "update user role")
		}
		updated++
	}
	logger.Infof(ctx, "updated role of %d users to %s", updated, roleCode)
	return updated, nil
}

// Remove 软删除用户并解除团队成员关系。
func (s *serviceImpl) Remove(ctx context.Context, ids []int64, actorID int64) (int, error) {
	ids, err := normalizeIDs(ids)
	if err != nil {
		return 0, err
	}
	for _, id := range ids {
		if id == actorID {
			return 0, bizerr.New(CodeCannotRemoveSelf)
		}
	}
	rows, err := s.loadLDAPUsers(ctx, ids)
	if err != nil {
		return 0, err
	}
	removed := 0
	for _, row := range rows {
		if row.Id == actorID {
			return 0, bizerr.New(CodeCannotRemoveSelf)
		}
		if err := dao.SysUser.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
			if _, err := dao.SysTeamMember.Ctx(ctx).Where(do.SysTeamMember{UserId: row.Id}).Delete(); err != nil {
				return gerror.Wrap(err, "remove team memberships")
			}
			if _, err := dao.SysUserSession.Ctx(ctx).Where(do.SysUserSession{UserId: row.Id}).Data(do.SysUserSession{
				RevokedAt: gtime.Now(),
			}).Update(); err != nil {
				return gerror.Wrap(err, "revoke user sessions")
			}
			if _, err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Id: row.Id}).Delete(); err != nil {
				return gerror.Wrap(err, "delete platform user")
			}
			return nil
		}); err != nil {
			return removed, err
		}
		removed++
	}
	logger.Infof(ctx, "removed %d platform users", removed)
	return removed, nil
}

func (s *serviceImpl) loadLDAPUsers(ctx context.Context, ids []int64) ([]*entity.SysUser, error) {
	var rows []*entity.SysUser
	err := dao.SysUser.Ctx(ctx).
		Where(do.SysUser{Source: string(auth.UserSourceLDAP)}).
		WhereIn(dao.SysUser.Columns().Id, ids).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "load platform users")
	}
	return rows, nil
}

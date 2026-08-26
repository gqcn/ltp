// 本文件实现团队创建、编辑与成员维护。

package team

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Create 创建团队并将负责人加入成员。
func (s *serviceImpl) Create(ctx context.Context, in CreateInput) (int64, error) {
	name, err := normalizeName(in.Name)
	if err != nil {
		return 0, err
	}
	if err := s.ensureNameFree(ctx, name, 0); err != nil {
		return 0, err
	}
	owner, err := s.userSvc.GetEnabled(ctx, in.OwnerUserID)
	if err != nil {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请从用户列表中选择负责人"))
	}
	var id int64
	err = dao.SysTeam.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		newID, err := dao.SysTeam.Ctx(ctx).Data(do.SysTeam{
			Name:        name,
			Description: strings.TrimSpace(in.Description),
			OwnerUserId: owner.ID,
		}).InsertAndGetId()
		if err != nil {
			return gerror.Wrap(err, "insert team")
		}
		id = newID
		if _, err := dao.SysTeamMember.Ctx(ctx).Data(do.SysTeamMember{
			TeamId: newID,
			UserId: owner.ID,
		}).Insert(); err != nil {
			return gerror.Wrap(err, "insert team owner membership")
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	logger.Infof(ctx, "created team %s id=%d", name, id)
	return id, nil
}

// Update 修改名称、描述与负责人。
func (s *serviceImpl) Update(ctx context.Context, in UpdateInput) error {
	row, err := s.mustGet(ctx, in.ID)
	if err != nil {
		return err
	}
	name, err := normalizeName(in.Name)
	if err != nil {
		return err
	}
	if err := s.ensureNameFree(ctx, name, in.ID); err != nil {
		return err
	}
	owner, err := s.userSvc.GetEnabled(ctx, in.OwnerUserID)
	if err != nil {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请从用户列表中选择负责人"))
	}
	err = dao.SysTeam.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		if _, err := dao.SysTeam.Ctx(ctx).Where(do.SysTeam{Id: row.Id}).Data(do.SysTeam{
			Name:        name,
			Description: strings.TrimSpace(in.Description),
			OwnerUserId: owner.ID,
		}).Update(); err != nil {
			return gerror.Wrap(err, "update team")
		}
		if _, err := dao.SysTeamMember.Ctx(ctx).Data(do.SysTeamMember{
			TeamId: row.Id,
			UserId: owner.ID,
		}).InsertIgnore(); err != nil {
			return gerror.Wrap(err, "ensure owner membership")
		}
		return nil
	})
	if err != nil {
		return err
	}
	logger.Infof(ctx, "updated team id=%d", row.Id)
	return nil
}

// AddMember 添加启用中的平台用户。
func (s *serviceImpl) AddMember(ctx context.Context, teamID int64, userID int64) error {
	if _, err := s.mustGet(ctx, teamID); err != nil {
		return err
	}
	member, err := s.userSvc.GetEnabled(ctx, userID)
	if err != nil {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "仅可添加启用中的平台用户"))
	}
	if _, err := dao.SysTeamMember.Ctx(ctx).Data(do.SysTeamMember{
		TeamId: teamID,
		UserId: member.ID,
	}).InsertIgnore(); err != nil {
		return gerror.Wrap(err, "add team member")
	}
	logger.Infof(ctx, "added member %d to team %d", member.ID, teamID)
	return nil
}

// RemoveMember 解除成员关系。
func (s *serviceImpl) RemoveMember(ctx context.Context, teamID int64, userID int64) error {
	if _, err := s.mustGet(ctx, teamID); err != nil {
		return err
	}
	if _, err := dao.SysTeamMember.Ctx(ctx).Where(do.SysTeamMember{
		TeamId: teamID,
		UserId: userID,
	}).Delete(); err != nil {
		return gerror.Wrap(err, "remove team member")
	}
	logger.Infof(ctx, "removed member %d from team %d", userID, teamID)
	return nil
}

func (s *serviceImpl) ensureNameFree(ctx context.Context, name string, excludeID int64) error {
	mod := dao.SysTeam.Ctx(ctx).Where(do.SysTeam{Name: name})
	if excludeID > 0 {
		mod = mod.WhereNot(dao.SysTeam.Columns().Id, excludeID)
	}
	var dup *entity.SysTeam
	if err := mod.Scan(&dup); err != nil {
		return gerror.Wrap(err, "check team name")
	}
	if dup != nil {
		return bizerr.New(CodeNameExists)
	}
	return nil
}

func normalizeName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写团队名称"))
	}
	return name, nil
}

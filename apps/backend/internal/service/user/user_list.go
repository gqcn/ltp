// 本文件实现平台用户列表、启用用户读取与账号存在性批量查询。

package user

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/auth"
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type memberRow struct {
	UserID   int64  `orm:"user_id"`   // 用户 ID
	TeamID   int64  `orm:"team_id"`   // 团队 ID
	TeamName string `orm:"team_name"` // 团队名称
}

// List 返回从 LDAP 加入的平台用户。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod := s.listModel(ctx, in)
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count users")
	}
	var rows []*entity.SysUser
	if err := s.listModel(ctx, in).
		OrderDesc(dao.SysUser.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list users")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total}, nil
}

// GetEnabled 返回启用中的平台 LDAP 用户。
func (s *serviceImpl) GetEnabled(ctx context.Context, id int64) (*Item, error) {
	var row *entity.SysUser
	err := dao.SysUser.Ctx(ctx).Where(do.SysUser{
		Id:     id,
		Source: string(auth.UserSourceLDAP),
		Status: int(auth.UserStatusEnabled),
	}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get enabled user")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	items, err := s.projectItems(ctx, []*entity.SysUser{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return items[0], nil
}

// ExistingUsernames 批量判断账号是否已在平台用户列表中。
func (s *serviceImpl) ExistingUsernames(ctx context.Context, usernames []string) (map[string]bool, error) {
	out := make(map[string]bool, len(usernames))
	if len(usernames) == 0 {
		return out, nil
	}
	var rows []*entity.SysUser
	err := dao.SysUser.Ctx(ctx).
		Fields(dao.SysUser.Columns().Username).
		Where(do.SysUser{Source: string(auth.UserSourceLDAP)}).
		WhereIn(dao.SysUser.Columns().Username, usernames).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list existing usernames")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.Username] = true
	}
	return out, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.SysUser.Columns()
	mod := dao.SysUser.Ctx(ctx).Where(do.SysUser{Source: string(auth.UserSourceLDAP)})
	if in.Enabled != nil {
		status := auth.UserStatusDisabled
		if *in.Enabled {
			status = auth.UserStatusEnabled
		}
		mod = mod.Where(do.SysUser{Status: int(status)})
	}
	if code, ok := role.ParseCode(in.RoleCode); ok {
		mod = mod.Where(do.SysUser{RoleCode: string(code)})
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword != "" {
		pattern := "%" + keyword + "%"
		mod = mod.Where(
			mod.Builder().
				WhereLike(cols.Nickname, pattern).
				WhereOrLike(cols.Username, pattern).
				WhereOrLike(cols.Email, pattern).
				WhereOrLike(cols.Department, pattern),
		)
	}
	return mod
}

func (s *serviceImpl) projectItems(ctx context.Context, rows []*entity.SysUser) ([]*Item, error) {
	roleNames, err := s.roleNames(ctx)
	if err != nil {
		return nil, err
	}
	teams, err := s.teamsByUser(ctx, userIDs(rows))
	if err != nil {
		return nil, err
	}
	out := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		code, _ := role.ParseCode(row.RoleCode)
		out = append(out, &Item{
			ID:          row.Id,
			Username:    row.Username,
			Nickname:    row.Nickname,
			Email:       row.Email,
			Department:  row.Department,
			Title:       row.Title,
			RoleCode:    code,
			RoleName:    roleNames[string(code)],
			Teams:       teams[row.Id],
			Enabled:     auth.UserStatus(row.Status) == auth.UserStatusEnabled,
			LastLoginAt: model.UnixMilli(row.LastLoginAt),
			CreatedAt:   model.UnixMilli(row.CreatedAt),
		})
	}
	return out, nil
}

func (s *serviceImpl) roleNames(ctx context.Context) (map[string]string, error) {
	roles, err := s.roleSvc.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(roles))
	for _, item := range roles {
		if item == nil {
			continue
		}
		out[string(item.Code)] = item.Name
	}
	return out, nil
}

func (s *serviceImpl) teamsByUser(ctx context.Context, ids []int64) (map[int64][]TeamRef, error) {
	out := make(map[int64][]TeamRef, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	var rows []memberRow
	err := dao.SysTeamMember.Ctx(ctx).
		As("m").
		LeftJoin("sys_team t", "t.id = m.team_id").
		Fields("m.user_id as user_id, t.id as team_id, t.name as team_name").
		WhereIn("m.user_id", ids).
		WhereNull("t.deleted_at").
		OrderAsc("t.id").
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list user teams")
	}
	for _, row := range rows {
		if row.TeamID == 0 || row.TeamName == "" {
			continue
		}
		out[row.UserID] = append(out[row.UserID], TeamRef{ID: row.TeamID, Name: row.TeamName})
	}
	return out, nil
}

func userIDs(rows []*entity.SysUser) []int64 {
	out := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, row.Id)
	}
	return out
}

func normalizePage(pageNum int, pageSize int) (int, int) {
	if pageNum < 1 {
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

func normalizeIDs(ids []int64) ([]int64, error) {
	seen := make(map[int64]struct{}, len(ids))
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id < 1 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	if len(out) == 0 {
		return nil, bizerr.New(CodeInvalidInput, bizerr.P("message", "请选择用户"))
	}
	if len(out) > maxBatchIDs {
		return nil, bizerr.New(CodeInvalidInput, bizerr.P("message", "单次最多操作 100 个用户"))
	}
	return out, nil
}

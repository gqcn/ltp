// 本文件实现团队列表与详情查询。

package team

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type countRow struct {
	TeamID int64 `orm:"team_id"` // 团队 ID
	Count  int   `orm:"count"`   // 成员数
}

// List 返回经过筛选和分页的团队列表。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod := s.listModel(ctx, in)
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count teams")
	}
	var rows []*entity.SysTeam
	if err := s.listModel(ctx, in).
		OrderDesc(dao.SysTeam.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list teams")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total}, nil
}

// Get 返回团队详情与成员列表。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Detail, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	items, err := s.projectItems(ctx, []*entity.SysTeam{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	members, err := s.loadMembers(ctx, id)
	if err != nil {
		return nil, err
	}
	queues := []QueueRef{}
	if s.queues != nil {
		byTeam, qerr := s.queues.ListByTeamIDs(ctx, []int64{id})
		if qerr != nil {
			return nil, qerr
		}
		if list := byTeam[id]; list != nil {
			queues = list
		}
	}
	return &Detail{
		Item:      *items[0],
		Members:   members,
		Queues:    queues,
		UpdatedAt: model.UnixMilli(row.UpdatedAt),
	}, nil
}

// ListIDsByUserID 返回用户加入的团队 ID。
func (s *serviceImpl) ListIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	if userID <= 0 {
		return []int64{}, nil
	}
	var rows []countRow
	err := dao.SysTeamMember.Ctx(ctx).
		Fields(dao.SysTeamMember.Columns().TeamId + " as team_id, 0 as count").
		Where(do.SysTeamMember{UserId: userID}).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list team ids by user")
	}
	out := make([]int64, 0, len(rows))
	seen := map[int64]struct{}{}
	for _, row := range rows {
		if row.TeamID <= 0 {
			continue
		}
		if _, ok := seen[row.TeamID]; ok {
			continue
		}
		seen[row.TeamID] = struct{}{}
		out = append(out, row.TeamID)
	}
	return out, nil
}

// ListNameRefsByUserID 返回用户加入的团队名称。
func (s *serviceImpl) ListNameRefsByUserID(ctx context.Context, userID int64) ([]NameRef, error) {
	ids, err := s.ListIDsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	names, err := s.MapByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]NameRef, 0, len(ids))
	for _, id := range ids {
		if ref, ok := names[id]; ok {
			out = append(out, ref)
		}
	}
	return out, nil
}

// MapByIDs 按 ID 批量返回团队名称。
func (s *serviceImpl) MapByIDs(ctx context.Context, ids []int64) (map[int64]NameRef, error) {
	out := make(map[int64]NameRef, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	var rows []*entity.SysTeam
	if err := dao.SysTeam.Ctx(ctx).WhereIn(dao.SysTeam.Columns().Id, ids).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "map teams by id")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.Id] = NameRef{ID: row.Id, Name: row.Name}
	}
	return out, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.SysTeam.Columns()
	mod := dao.SysTeam.Ctx(ctx)
	keyword := strings.TrimSpace(in.Keyword)
	if keyword == "" {
		return mod
	}
	pattern := "%" + keyword + "%"
	var owners []*entity.SysUser
	_ = dao.SysUser.Ctx(ctx).
		Fields(dao.SysUser.Columns().Id).
		Where(
			dao.SysUser.Ctx(ctx).Builder().
				WhereLike(dao.SysUser.Columns().Nickname, pattern).
				WhereOrLike(dao.SysUser.Columns().Username, pattern),
		).
		Scan(&owners)
	ownerIDs := make([]int64, 0, len(owners))
	for _, owner := range owners {
		if owner != nil {
			ownerIDs = append(ownerIDs, owner.Id)
		}
	}
	builder := mod.Builder().WhereLike(cols.Name, pattern).WhereOrLike(cols.Description, pattern)
	if len(ownerIDs) > 0 {
		builder = builder.WhereOrIn(cols.OwnerUserId, ownerIDs)
	}
	return mod.Where(builder)
}

func (s *serviceImpl) projectItems(ctx context.Context, rows []*entity.SysTeam) ([]*Item, error) {
	ownerIDs := make([]int64, 0, len(rows))
	teamIDs := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		ownerIDs = append(ownerIDs, row.OwnerUserId)
		teamIDs = append(teamIDs, row.Id)
	}
	owners, err := s.loadOwners(ctx, ownerIDs)
	if err != nil {
		return nil, err
	}
	counts, err := s.memberCounts(ctx, teamIDs)
	if err != nil {
		return nil, err
	}
	out := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, &Item{
			ID:          row.Id,
			Name:        row.Name,
			Description: row.Description,
			Owner:       owners[row.OwnerUserId],
			MemberCount: counts[row.Id],
			CreatedAt:   model.UnixMilli(row.CreatedAt),
		})
	}
	return out, nil
}

func (s *serviceImpl) loadOwners(ctx context.Context, ids []int64) (map[int64]Owner, error) {
	out := make(map[int64]Owner, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	var rows []*entity.SysUser
	err := dao.SysUser.Ctx(ctx).WhereIn(dao.SysUser.Columns().Id, ids).Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "load team owners")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.Id] = Owner{ID: row.Id, Username: row.Username, Nickname: row.Nickname}
	}
	return out, nil
}

func (s *serviceImpl) memberCounts(ctx context.Context, teamIDs []int64) (map[int64]int, error) {
	out := make(map[int64]int, len(teamIDs))
	if len(teamIDs) == 0 {
		return out, nil
	}
	var rows []countRow
	err := dao.SysTeamMember.Ctx(ctx).
		Fields(dao.SysTeamMember.Columns().TeamId+" as team_id, count(1) as count").
		WhereIn(dao.SysTeamMember.Columns().TeamId, teamIDs).
		Group(dao.SysTeamMember.Columns().TeamId).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "count team members")
	}
	for _, row := range rows {
		out[row.TeamID] = row.Count
	}
	return out, nil
}

func (s *serviceImpl) loadMembers(ctx context.Context, teamID int64) ([]Member, error) {
	var links []*entity.SysTeamMember
	err := dao.SysTeamMember.Ctx(ctx).
		Where(do.SysTeamMember{TeamId: teamID}).
		OrderAsc(dao.SysTeamMember.Columns().Id).
		Scan(&links)
	if err != nil {
		return nil, gerror.Wrap(err, "list team members")
	}
	ids := make([]int64, 0, len(links))
	for _, link := range links {
		if link != nil {
			ids = append(ids, link.UserId)
		}
	}
	if len(ids) == 0 {
		return []Member{}, nil
	}
	var users []*entity.SysUser
	err = dao.SysUser.Ctx(ctx).WhereIn(dao.SysUser.Columns().Id, ids).Scan(&users)
	if err != nil {
		return nil, gerror.Wrap(err, "load member users")
	}
	byID := make(map[int64]*entity.SysUser, len(users))
	for _, item := range users {
		if item != nil {
			byID[item.Id] = item
		}
	}
	out := make([]Member, 0, len(ids))
	for _, id := range ids {
		item := byID[id]
		if item == nil {
			continue
		}
		out = append(out, Member{
			ID:         item.Id,
			Username:   item.Username,
			Nickname:   item.Nickname,
			Email:      item.Email,
			Department: item.Department,
		})
	}
	return out, nil
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.SysTeam, error) {
	var row *entity.SysTeam
	err := dao.SysTeam.Ctx(ctx).Where(do.SysTeam{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get team")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
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

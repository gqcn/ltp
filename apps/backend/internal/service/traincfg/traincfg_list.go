// 本文件实现配置集列表、详情与版本读取。

package traincfg

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// List 按可见性过滤并分页。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod, err := s.listModel(ctx, in)
	if err != nil {
		return nil, err
	}
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count configs")
	}
	var rows []*entity.TrainConfigSet
	if err := mod.OrderDesc(dao.TrainConfigSet.Columns().UpdatedAt).Page(pageNum, pageSize).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list configs")
	}
	items, err := s.projectList(ctx, in.Actor, rows)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total}, nil
}

// Get 返回详情。
func (s *serviceImpl) Get(ctx context.Context, actor Actor, id int64) (*Item, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	items, err := s.projectList(ctx, actor, []*entity.TrainConfigSet{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	item := items[0]
	if row.LatestVersion > 0 {
		ver, err := s.loadVersion(ctx, row.Id, row.LatestVersion, true)
		if err != nil {
			return nil, err
		}
		if ver != nil {
			item.Files = ver.Files
			item.FileCount = ver.FileCount
		}
	}
	item.Versions, err = s.loadHistory(ctx, row.Id)
	if err != nil {
		return nil, err
	}
	draft, err := s.loadDraft(ctx, row.Id)
	if err != nil {
		return nil, err
	}
	if draft != nil && (actor.IsAdmin || draft.ownerID == actor.UserID) {
		item.Draft = &Draft{
			OwnerUsername: draft.OwnerUsername,
			OwnerNickname: draft.OwnerNickname,
			Message:       draft.Message,
			Files:         draft.Files,
			UpdatedAt:     draft.UpdatedAt,
		}
		item.HasDraft = draft.ownerID == actor.UserID
		item.DraftUpdatedAt = draft.UpdatedAt
		if row.LatestVersion == 0 {
			item.FileCount = len(draft.Files)
		}
	}
	item.Description = row.Description
	return item, nil
}

// GetVersion 返回历史版本文件。
func (s *serviceImpl) GetVersion(ctx context.Context, actor Actor, id int64, version int) (*Version, error) {
	if _, err := s.mustVisible(ctx, actor, id); err != nil {
		return nil, err
	}
	ver, err := s.loadVersion(ctx, id, version, true)
	if err != nil {
		return nil, err
	}
	if ver == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return ver, nil
}

// Snapshot 返回已发布版本文件，不做会话可见性过滤。
func (s *serviceImpl) Snapshot(ctx context.Context, setID int64, version int) (*Item, []File, error) {
	var row *entity.TrainConfigSet
	if err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: setID}).Scan(&row); err != nil {
		return nil, nil, gerror.Wrap(err, "get config for snapshot")
	}
	if row == nil {
		return nil, nil, bizerr.New(CodeNotFound)
	}
	ver, err := s.loadVersion(ctx, setID, version, true)
	if err != nil {
		return nil, nil, err
	}
	if ver == nil {
		return nil, nil, errInvalid("配置版本不存在")
	}
	names, err := s.teamSvc.MapByIDs(ctx, []int64{row.TeamId})
	if err != nil {
		return nil, nil, err
	}
	teamName := names[row.TeamId].Name
	return &Item{
		ID:            row.Id,
		Name:          row.Name,
		DisplayName:   row.DisplayName,
		TeamID:        row.TeamId,
		TeamName:      teamName,
		Framework:     row.Framework,
		Visibility:    row.Visibility,
		Status:        row.Status,
		LatestVersion: row.LatestVersion,
		OwnerUsername: row.OwnerUsername,
		OwnerNickname: row.OwnerNickname,
	}, ver.Files, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) (*gdb.Model, error) {
	cols := dao.TrainConfigSet.Columns()
	mod := dao.TrainConfigSet.Ctx(ctx)
	if !in.Actor.seesAllTeams() {
		teamIDs, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if len(teamIDs) == 0 {
			mod = mod.Where("1=0")
		} else {
			mod = mod.WhereIn(cols.TeamId, teamIDs).Where(
				mod.Builder().
					Where(do.TrainConfigSet{Visibility: visTeam}).
					WhereOr(do.TrainConfigSet{OwnerUserId: in.Actor.UserID}),
			)
		}
	}
	if in.TeamID > 0 {
		mod = mod.Where(do.TrainConfigSet{TeamId: in.TeamID})
	}
	if status := strings.TrimSpace(in.Status); status != "" && status != "all" {
		mod = mod.Where(do.TrainConfigSet{Status: status})
	}
	if fw := strings.TrimSpace(in.Framework); fw != "" && fw != "all" {
		mod = mod.Where(do.TrainConfigSet{Framework: fw})
	}
	scope := strings.TrimSpace(in.Scope)
	switch scope {
	case "", "all":
	case "mine":
		mod = mod.Where(do.TrainConfigSet{OwnerUserId: in.Actor.UserID})
	case visTeam:
		mod = mod.Where(do.TrainConfigSet{Visibility: visTeam})
	case visPrivate:
		mod = mod.Where(do.TrainConfigSet{Visibility: visPrivate, OwnerUserId: in.Actor.UserID})
	case "draft":
		ids, err := s.draftSetIDs(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if len(ids) == 0 {
			mod = mod.Where("1=0")
		} else {
			mod = mod.WhereIn(cols.Id, ids)
		}
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword != "" {
		pattern := "%" + keyword + "%"
		mod = mod.Where(mod.Builder().WhereLike(cols.DisplayName, pattern).WhereOrLike(cols.Name, pattern))
	}
	return mod, nil
}

func (s *serviceImpl) projectList(ctx context.Context, actor Actor, rows []*entity.TrainConfigSet) ([]*Item, error) {
	teamIDs := make([]int64, 0, len(rows))
	setIDs := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		teamIDs = append(teamIDs, row.TeamId)
		setIDs = append(setIDs, row.Id)
	}
	names, err := s.teamSvc.MapByIDs(ctx, teamIDs)
	if err != nil {
		return nil, err
	}
	drafts, err := s.draftMetaBySets(ctx, actor.UserID, setIDs)
	if err != nil {
		return nil, err
	}
	latestMeta, err := s.latestVersionMeta(ctx, rows)
	if err != nil {
		return nil, err
	}
	out := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		meta := latestMeta[row.Id]
		item := &Item{
			ID:            row.Id,
			Name:          row.Name,
			DisplayName:   row.DisplayName,
			TeamID:        row.TeamId,
			TeamName:      names[row.TeamId].Name,
			Framework:     row.Framework,
			Visibility:    row.Visibility,
			Status:        row.Status,
			Description:   row.Description,
			LatestVersion: row.LatestVersion,
			LatestMessage: meta.Message,
			FileCount:     meta.FileCount,
			OwnerUsername: row.OwnerUsername,
			OwnerNickname: row.OwnerNickname,
			Files:         []File{},
			Versions:      []Version{},
			CreatedAt:     model.UnixMilli(row.CreatedAt),
			UpdatedAt:     model.UnixMilli(row.UpdatedAt),
		}
		if meta, ok := drafts[row.Id]; ok {
			item.HasDraft = true
			item.DraftUpdatedAt = meta
			if row.LatestVersion == 0 && item.FileCount == 0 {
				item.FileCount = 0
			}
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *serviceImpl) draftSetIDs(ctx context.Context, userID int64) ([]int64, error) {
	var rows []*entity.TrainConfigDraft
	err := dao.TrainConfigDraft.Ctx(ctx).
		Fields(dao.TrainConfigDraft.Columns().SetId).
		Where(do.TrainConfigDraft{OwnerUserId: userID}).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list draft set ids")
	}
	out := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			out = append(out, row.SetId)
		}
	}
	return out, nil
}

func (s *serviceImpl) draftMetaBySets(ctx context.Context, userID int64, setIDs []int64) (map[int64]int64, error) {
	out := map[int64]int64{}
	if userID <= 0 || len(setIDs) == 0 {
		return out, nil
	}
	var rows []*entity.TrainConfigDraft
	err := dao.TrainConfigDraft.Ctx(ctx).
		Where(do.TrainConfigDraft{OwnerUserId: userID}).
		WhereIn(dao.TrainConfigDraft.Columns().SetId, setIDs).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list drafts")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.SetId] = model.UnixMilli(row.UpdatedAt)
	}
	return out, nil
}

// latestVerMeta 是列表行所需的最新版本投影。
type latestVerMeta struct {
	FileCount int    // 文件数
	Message   string // 版本说明
}

func (s *serviceImpl) latestVersionMeta(ctx context.Context, rows []*entity.TrainConfigSet) (map[int64]latestVerMeta, error) {
	out := map[int64]latestVerMeta{}
	ids := make([]int64, 0, len(rows))
	want := map[int64]int{}
	for _, row := range rows {
		if row == nil || row.LatestVersion <= 0 {
			continue
		}
		ids = append(ids, row.Id)
		want[row.Id] = row.LatestVersion
	}
	if len(ids) == 0 {
		return out, nil
	}
	var vers []*entity.TrainConfigVersion
	if err := dao.TrainConfigVersion.Ctx(ctx).WhereIn(dao.TrainConfigVersion.Columns().SetId, ids).Scan(&vers); err != nil {
		return nil, gerror.Wrap(err, "list config versions for counts")
	}
	for _, ver := range vers {
		if ver == nil {
			continue
		}
		if want[ver.SetId] != ver.Version {
			continue
		}
		out[ver.SetId] = latestVerMeta{FileCount: len(decodeFiles(ver.Files)), Message: ver.Message}
	}
	return out, nil
}

type loadedDraft struct {
	ownerID       int64
	OwnerUsername string
	OwnerNickname string
	Message       string
	Files         []File
	UpdatedAt     int64
}

func (s *serviceImpl) loadDraft(ctx context.Context, setID int64) (*loadedDraft, error) {
	var row *entity.TrainConfigDraft
	if err := dao.TrainConfigDraft.Ctx(ctx).Where(do.TrainConfigDraft{SetId: setID}).Scan(&row); err != nil {
		return nil, gerror.Wrap(err, "get config draft")
	}
	if row == nil {
		return nil, nil
	}
	return &loadedDraft{
		ownerID:       row.OwnerUserId,
		OwnerUsername: row.OwnerUsername,
		OwnerNickname: row.OwnerNickname,
		Message:       row.Message,
		Files:         decodeFiles(row.Files),
		UpdatedAt:     model.UnixMilli(row.UpdatedAt),
	}, nil
}

func (s *serviceImpl) loadVersion(ctx context.Context, setID int64, version int, withFiles bool) (*Version, error) {
	var row *entity.TrainConfigVersion
	if err := dao.TrainConfigVersion.Ctx(ctx).Where(do.TrainConfigVersion{SetId: setID, Version: version}).Scan(&row); err != nil {
		return nil, gerror.Wrap(err, "get config version")
	}
	if row == nil {
		return nil, nil
	}
	files := decodeFiles(row.Files)
	out := &Version{
		Version:        row.Version,
		Message:        row.Message,
		AuthorUsername: row.AuthorUsername,
		AuthorNickname: row.AuthorNickname,
		Digest:         row.Digest,
		FileCount:      len(files),
		Files:          []File{},
		CreatedAt:      model.UnixMilli(row.CreatedAt),
	}
	if withFiles {
		out.Files = files
	}
	return out, nil
}

func (s *serviceImpl) loadHistory(ctx context.Context, setID int64) ([]Version, error) {
	var rows []*entity.TrainConfigVersion
	err := dao.TrainConfigVersion.Ctx(ctx).
		Where(do.TrainConfigVersion{SetId: setID}).
		OrderDesc(dao.TrainConfigVersion.Columns().Version).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list config versions")
	}
	out := make([]Version, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, Version{
			Version:        row.Version,
			Message:        row.Message,
			AuthorUsername: row.AuthorUsername,
			AuthorNickname: row.AuthorNickname,
			Digest:         row.Digest,
			FileCount:      len(decodeFiles(row.Files)),
			Files:          []File{},
			CreatedAt:      model.UnixMilli(row.CreatedAt),
		})
	}
	return out, nil
}

func decodeFiles(raw string) []File {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []File{}
	}
	var out []File
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []File{}
	}
	if out == nil {
		return []File{}
	}
	return out
}

func normalizePage(pageNum, pageSize int) (int, int) {
	if pageNum < defaultListNum {
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

// 本文件实现队列列表、详情、团队投影与数据中心计数。

package queue

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
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type teamLinkRow struct {
	QueueID int64 `orm:"queue_id"` // 队列 ID
	TeamID  int64 `orm:"team_id"`  // 团队 ID
}

type countByDCRow struct {
	Code  string `orm:"datacenter_code"` // 数据中心
	Count int    `orm:"count"`           // 数量
}

// List 返回分页队列并刷新 Volcano 已用。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	total, err := s.listModel(ctx, in).Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count queues")
	}
	var rows []*entity.OpsQueue
	if err := s.listModel(ctx, in).
		OrderDesc(dao.OpsQueue.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list queues")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total}, nil
}

// Get 返回队列详情。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	items, err := s.projectItems(ctx, []*entity.OpsQueue{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return items[0], nil
}

// CountQueuesByDatacenter 按数据中心批量统计队列。
func (s *serviceImpl) CountQueuesByDatacenter(ctx context.Context, codes []string) (map[string]int, error) {
	out := make(map[string]int, len(codes))
	for _, code := range codes {
		out[code] = 0
	}
	if len(codes) == 0 {
		return out, nil
	}
	var rows []countByDCRow
	err := dao.OpsQueue.Ctx(ctx).
		Fields(dao.OpsQueue.Columns().DatacenterCode+" as datacenter_code, count(1) as count").
		WhereIn(dao.OpsQueue.Columns().DatacenterCode, codes).
		Group(dao.OpsQueue.Columns().DatacenterCode).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "count queues by datacenter")
	}
	for _, row := range rows {
		out[row.Code] = row.Count
	}
	return out, nil
}

// ListByTeamIDs 按团队批量返回关联队列。
func (s *serviceImpl) ListByTeamIDs(ctx context.Context, teamIDs []int64) (map[int64][]team.QueueRef, error) {
	out := make(map[int64][]team.QueueRef, len(teamIDs))
	for _, id := range teamIDs {
		out[id] = []team.QueueRef{}
	}
	if len(teamIDs) == 0 {
		return out, nil
	}
	var links []teamLinkRow
	err := dao.OpsQueueTeam.Ctx(ctx).
		Fields(dao.OpsQueueTeam.Columns().QueueId+", "+dao.OpsQueueTeam.Columns().TeamId).
		WhereIn(dao.OpsQueueTeam.Columns().TeamId, teamIDs).
		Scan(&links)
	if err != nil {
		return nil, gerror.Wrap(err, "list queue teams")
	}
	queueIDs := make([]int64, 0, len(links))
	seenQ := map[int64]struct{}{}
	for _, link := range links {
		if _, ok := seenQ[link.QueueID]; ok {
			continue
		}
		seenQ[link.QueueID] = struct{}{}
		queueIDs = append(queueIDs, link.QueueID)
	}
	if len(queueIDs) == 0 {
		return out, nil
	}
	var rows []*entity.OpsQueue
	if err := dao.OpsQueue.Ctx(ctx).WhereIn(dao.OpsQueue.Columns().Id, queueIDs).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list queues by team")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	byID := map[int64]*Item{}
	for _, item := range items {
		byID[item.ID] = item
	}
	for _, link := range links {
		item := byID[link.QueueID]
		if item == nil {
			continue
		}
		out[link.TeamID] = append(out[link.TeamID], team.QueueRef{
			ID:             item.ID,
			Name:           item.Name,
			DisplayName:    item.DisplayName,
			DatacenterCode: item.DatacenterCode,
			Enabled:        item.Enabled,
			State:          item.State,
		})
	}
	return out, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.OpsQueue.Columns()
	mod := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{ClusterId: in.ClusterID})
	if code := strings.TrimSpace(in.DatacenterCode); code != "" && code != "all" {
		mod = mod.Where(do.OpsQueue{DatacenterCode: code})
	}
	if gpu := strings.TrimSpace(in.GPUType); gpu != "" && gpu != "all" {
		mod = mod.Where(do.OpsQueue{GpuType: gpu})
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword == "" {
		return mod
	}
	pattern := "%" + keyword + "%"
	teamIDs := s.teamIDsMatching(ctx, keyword)
	builder := mod.Builder().
		WhereLike(cols.Name, pattern).
		WhereOrLike(cols.DisplayName, pattern).
		WhereOrLike(cols.Description, pattern)
	if len(teamIDs) > 0 {
		var links []teamLinkRow
		_ = dao.OpsQueueTeam.Ctx(ctx).
			Fields(dao.OpsQueueTeam.Columns().QueueId+" as queue_id").
			WhereIn(dao.OpsQueueTeam.Columns().TeamId, teamIDs).
			Scan(&links)
		qids := make([]int64, 0, len(links))
		for _, link := range links {
			qids = append(qids, link.QueueID)
		}
		if len(qids) > 0 {
			builder = builder.WhereOrIn(cols.Id, qids)
		}
	}
	return mod.Where(builder)
}

func (s *serviceImpl) teamIDsMatching(ctx context.Context, keyword string) []int64 {
	var rows []*entity.SysTeam
	pattern := "%" + keyword + "%"
	_ = dao.SysTeam.Ctx(ctx).WhereLike(dao.SysTeam.Columns().Name, pattern).Scan(&rows)
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			ids = append(ids, row.Id)
		}
	}
	return ids
}

func (s *serviceImpl) projectItems(ctx context.Context, rows []*entity.OpsQueue) ([]*Item, error) {
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			ids = append(ids, row.Id)
		}
	}
	teams, err := s.loadTeams(ctx, ids)
	if err != nil {
		return nil, err
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		item := toItem(row, teams[row.Id])
		s.refreshVolcano(ctx, item)
		items = append(items, item)
	}
	return items, nil
}

func (s *serviceImpl) refreshVolcano(ctx context.Context, item *Item) {
	client, err := s.clusterSvc.Client(ctx, item.ClusterID)
	if err != nil {
		item.SyncError = err.Error()
		item.State = "Unknown"
		item.Enabled = false
		return
	}
	snap, err := client.GetQueue(ctx, item.Name)
	if err != nil {
		if bizerr.Is(err, kube.CodeQueueNotFound) {
			item.SyncError = syncErrQueueMissing
			item.State = "Unknown"
			item.Enabled = false
			return
		}
		item.SyncError = err.Error()
		item.State = "Unknown"
		item.Enabled = false
		return
	}
	item.State = snap.State
	item.Enabled = snap.State != "Closed" && snap.State != "Closing"
	item.GPUUsed = snap.GPUUsed
	item.CPUUsed = snap.CPUUsed
	item.MemUsedGi = snap.MemUsedGi
	item.Pending = snap.Pending
	item.Running = snap.Running
}

func (s *serviceImpl) loadTeams(ctx context.Context, queueIDs []int64) (map[int64][]TeamRef, error) {
	out := make(map[int64][]TeamRef, len(queueIDs))
	if len(queueIDs) == 0 {
		return out, nil
	}
	var links []teamLinkRow
	err := dao.OpsQueueTeam.Ctx(ctx).
		WhereIn(dao.OpsQueueTeam.Columns().QueueId, queueIDs).
		Scan(&links)
	if err != nil {
		return nil, gerror.Wrap(err, "load queue teams")
	}
	teamIDs := make([]int64, 0, len(links))
	seen := map[int64]struct{}{}
	for _, link := range links {
		if _, ok := seen[link.TeamID]; ok {
			continue
		}
		seen[link.TeamID] = struct{}{}
		teamIDs = append(teamIDs, link.TeamID)
	}
	names, err := s.teamSvc.MapByIDs(ctx, teamIDs)
	if err != nil {
		return nil, err
	}
	for _, link := range links {
		ref, ok := names[link.TeamID]
		if !ok {
			continue
		}
		out[link.QueueID] = append(out[link.QueueID], TeamRef{ID: ref.ID, Name: ref.Name})
	}
	return out, nil
}

func toItem(row *entity.OpsQueue, teams []TeamRef) *Item {
	if teams == nil {
		teams = []TeamRef{}
	}
	return &Item{
		ID:             row.Id,
		ClusterID:      row.ClusterId,
		Name:           row.Name,
		DisplayName:    row.DisplayName,
		Description:    row.Description,
		DatacenterCode: row.DatacenterCode,
		GPUType:        row.GpuType,
		GPUQuota:       row.GpuQuota,
		CPUQuota:       row.CpuQuota,
		MemQuotaGi:     row.MemQuotaGi,
		Weight:         row.Weight,
		Reclaimable:    row.Reclaimable,
		Features:       parseFeatures(row.Features),
		Enabled:        true,
		State:          "Open",
		Teams:          teams,
		CreatedAt:      model.UnixMilli(row.CreatedAt),
		UpdatedAt:      model.UnixMilli(row.UpdatedAt),
	}
}

func parseFeatures(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	if out == nil {
		return []string{}
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

// 本文件实现告警列表、详情、处理与汇总。

package alert

import (
	"context"
	"strings"
	"time"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type statusCountRow struct {
	Status string `orm:"status"` // 状态
	Count  int    `orm:"count"`  // 数量
}

type severityCountRow struct {
	Severity string `orm:"severity"` // 级别
	Count    int    `orm:"count"`    // 数量
}

// List 筛选分页告警。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	total, err := s.listModel(ctx, in).Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count alerts")
	}
	var rows []*entity.OpsAlert
	if err := s.listModel(ctx, in).
		OrderDesc(dao.OpsAlert.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list alerts")
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			items = append(items, toItem(row, false))
		}
	}
	summary, err := s.Summary(ctx)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total, Summary: summary}, nil
}

const maxRelatedAlerts = 50

// ListByClusterNodes 按节点名求交返回告警。
func (s *serviceImpl) ListByClusterNodes(ctx context.Context, clusterID int64, nodes []string) ([]*Item, error) {
	cleaned := uniqueNodes(nodes)
	if clusterID <= 0 || len(cleaned) == 0 {
		return []*Item{}, nil
	}
	mod := dao.OpsAlert.Ctx(ctx).Where(do.OpsAlert{ClusterId: clusterID})
	builder := mod.Builder()
	for i, node := range cleaned {
		pattern := "%" + node + "%"
		if i == 0 {
			builder = builder.WhereLike(dao.OpsAlert.Columns().NodeNames, pattern)
			continue
		}
		builder = builder.WhereOrLike(dao.OpsAlert.Columns().NodeNames, pattern)
	}
	var rows []*entity.OpsAlert
	if err := mod.Where(builder).OrderDesc(dao.OpsAlert.Columns().Id).Limit(maxRelatedAlerts).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list alerts by nodes")
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row != nil {
			items = append(items, toItem(row, false))
		}
	}
	return items, nil
}

func uniqueNodes(nodes []string) []string {
	out := make([]string, 0, len(nodes))
	seen := map[string]struct{}{}
	for _, raw := range nodes {
		node := strings.TrimSpace(raw)
		if node == "" {
			continue
		}
		if _, ok := seen[node]; ok {
			continue
		}
		seen[node] = struct{}{}
		out = append(out, node)
		if len(out) >= 32 {
			break
		}
	}
	return out
}

// Get 返回含原始 JSON 的详情。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	return toItem(row, true), nil
}

// Handle 批量更新状态。
func (s *serviceImpl) Handle(ctx context.Context, in HandleInput) error {
	ids := uniqueIDs(in.IDs)
	if len(ids) == 0 {
		return errInvalid("请选择告警")
	}
	if len(ids) > maxBatchIDs {
		return errInvalid("单次最多处理 100 条告警")
	}
	status, ok := parseStatus(string(in.Status))
	if !ok {
		return errInvalid("告警状态无效")
	}
	n, err := dao.OpsAlert.Ctx(ctx).WhereIn(dao.OpsAlert.Columns().Id, ids).Count()
	if err != nil {
		return gerror.Wrap(err, "count alerts to handle")
	}
	if n != len(ids) {
		return bizerr.New(CodeNotFound)
	}
	if _, err := dao.OpsAlert.Ctx(ctx).WhereIn(dao.OpsAlert.Columns().Id, ids).Data(do.OpsAlert{
		Status:       string(status),
		HandleRemark: strings.TrimSpace(in.Remark),
		HandledBy:    strings.TrimSpace(in.Operator),
		HandledAt:    gtime.Now(),
	}).Update(); err != nil {
		return gerror.Wrap(err, "update alert status")
	}
	return nil
}

// Summary 返回未筛选 KPI。
func (s *serviceImpl) Summary(ctx context.Context) (Summary, error) {
	total, err := dao.OpsAlert.Ctx(ctx).Count()
	if err != nil {
		return Summary{}, gerror.Wrap(err, "count alerts")
	}
	var statusRows []statusCountRow
	if err := dao.OpsAlert.Ctx(ctx).
		Fields(dao.OpsAlert.Columns().Status + " as status, count(1) as count").
		Group(dao.OpsAlert.Columns().Status).
		Scan(&statusRows); err != nil {
		return Summary{}, gerror.Wrap(err, "count alerts by status")
	}
	var sevRows []severityCountRow
	if err := dao.OpsAlert.Ctx(ctx).
		Fields(dao.OpsAlert.Columns().Severity + " as severity, count(1) as count").
		Group(dao.OpsAlert.Columns().Severity).
		Scan(&sevRows); err != nil {
		return Summary{}, gerror.Wrap(err, "count alerts by severity")
	}
	out := Summary{Total: total}
	for _, row := range statusRows {
		switch Status(row.Status) {
		case StatusOpen:
			out.Open = row.Count
		case StatusFollowing:
			out.Following = row.Count
		case StatusHandled:
			out.Handled = row.Count
		}
	}
	for _, row := range sevRows {
		switch Severity(row.Severity) {
		case SeverityCritical:
			out.Critical = row.Count
		case SeverityWarning:
			out.Warning = row.Count
		case SeverityInfo:
			out.Info = row.Count
		}
	}
	out.Unfinished = out.Open + out.Following
	return out, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.OpsAlert.Columns()
	mod := dao.OpsAlert.Ctx(ctx)
	if in.ClusterID > 0 {
		mod = mod.Where(do.OpsAlert{ClusterId: in.ClusterID})
	}
	if in.Severity != "" && in.Severity != "all" {
		mod = mod.Where(do.OpsAlert{Severity: string(in.Severity)})
	}
	if in.Status != "" && in.Status != "all" {
		mod = mod.Where(do.OpsAlert{Status: string(in.Status)})
	}
	if since := rangeSince(in.Range); since != nil {
		mod = mod.Where(cols.CreatedAt+" >= ?", since)
	}
	keyword := strings.TrimSpace(in.Keyword)
	if keyword == "" {
		return mod
	}
	pattern := "%" + keyword + "%"
	return mod.Where(
		mod.Builder().
			WhereLike(cols.Title, pattern).
			WhereOrLike(cols.AlertInfo, pattern).
			WhereOrLike(cols.FaultInfo, pattern).
			WhereOrLike(cols.NodeNames, pattern).
			WhereOrLike(cols.Source, pattern),
	)
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.OpsAlert, error) {
	var row *entity.OpsAlert
	err := dao.OpsAlert.Ctx(ctx).Where(do.OpsAlert{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get alert")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

func toItem(row *entity.OpsAlert, withPayload bool) *Item {
	item := &Item{
		ID:           row.Id,
		DisplayID:    displayID(row.Id),
		ClusterID:    row.ClusterId,
		Severity:     Severity(row.Severity),
		Title:        row.Title,
		AlertInfo:    row.AlertInfo,
		FaultInfo:    row.FaultInfo,
		Source:       row.Source,
		NodeNames:    row.NodeNames,
		Status:       Status(row.Status),
		HandleRemark: row.HandleRemark,
		HandledAt:    model.UnixMilli(row.HandledAt),
		HandledBy:    row.HandledBy,
		FirstAlarmAt: model.UnixMilli(row.FirstAlarmAt),
		CreatedAt:    model.UnixMilli(row.CreatedAt),
		AlarmCount:   row.AlarmCount,
		AlarmLevel:   row.AlarmLevel,
		CreateUser:   row.CreateUser,
	}
	if withPayload {
		item.Payload = row.WebhookPayload
	}
	return item
}

func rangeSince(r Range) *gtime.Time {
	now := time.Now()
	switch r {
	case Range1h:
		return gtime.NewFromTime(now.Add(-time.Hour))
	case Range6h:
		return gtime.NewFromTime(now.Add(-6 * time.Hour))
	case Range7d:
		return gtime.NewFromTime(now.Add(-7 * 24 * time.Hour))
	case Range30d:
		return gtime.NewFromTime(now.Add(-30 * 24 * time.Hour))
	case RangeAll:
		return nil
	default:
		return gtime.NewFromTime(now.Add(-24 * time.Hour))
	}
}

func parseStatus(raw string) (Status, bool) {
	switch Status(strings.TrimSpace(raw)) {
	case StatusOpen, StatusFollowing, StatusHandled:
		return Status(raw), true
	default:
		return "", false
	}
}

func uniqueIDs(ids []int64) []int64 {
	seen := map[int64]struct{}{}
	var out []int64
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
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

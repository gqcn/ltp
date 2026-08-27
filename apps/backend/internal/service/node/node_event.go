// 本文件读写节点维护记录。

package node

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
)

// ListEvents 按时间倒序分页维护记录。
func (s *serviceImpl) ListEvents(ctx context.Context, in EventListInput) (*EventListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	mod := dao.OpsNodeEvent.Ctx(ctx).Where(do.OpsNodeEvent{ClusterId: in.ClusterID})
	if name := strings.TrimSpace(in.NodeName); name != "" {
		mod = mod.Where(do.OpsNodeEvent{NodeName: name})
	}
	total, err := mod.Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count node events")
	}
	var rows []*entity.OpsNodeEvent
	if err := mod.OrderDesc(dao.OpsNodeEvent.Columns().Id).Page(pageNum, pageSize).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list node events")
	}
	out := make([]*Event, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, &Event{
			ID:        row.Id,
			ClusterID: row.ClusterId,
			NodeName:  row.NodeName,
			Action:    Action(row.Action),
			Operator:  row.Operator,
			Remark:    row.Remark,
			Result:    Result(row.Result),
			CreatedAt: model.UnixMilli(row.CreatedAt),
		})
	}
	return &EventListOutput{List: out, Total: total}, nil
}

// attachIsolateRemarks 为当前页已隔离节点填入最近一次成功隔离备注。
func (s *serviceImpl) attachIsolateRemarks(ctx context.Context, clusterID int64, items []*Item) error {
	names := make([]string, 0, len(items))
	for _, item := range items {
		if item != nil && item.Isolated {
			names = append(names, item.Name)
		}
	}
	if len(names) == 0 {
		return nil
	}
	remarks, err := s.latestIsolateRemarks(ctx, clusterID, names)
	if err != nil {
		return err
	}
	for _, item := range items {
		if item == nil || !item.Isolated {
			continue
		}
		item.IsolateRemark = remarks[item.Name]
	}
	return nil
}

// latestIsolateRemarks 按节点名返回最近一次成功 isolate 备注，一次查询当前页全部名称。
func (s *serviceImpl) latestIsolateRemarks(ctx context.Context, clusterID int64, names []string) (map[string]string, error) {
	var (
		cols = dao.OpsNodeEvent.Columns()
		rows []*entity.OpsNodeEvent
	)
	err := dao.OpsNodeEvent.Ctx(ctx).
		Where(do.OpsNodeEvent{
			ClusterId: clusterID,
			Action:    string(ActionIsolate),
			Result:    string(ResultSuccess),
		}).
		WhereIn(cols.NodeName, names).
		OrderDesc(cols.Id).
		Scan(&rows)
	if err != nil {
		return nil, gerror.Wrap(err, "list isolate remarks")
	}
	out := make(map[string]string, len(names))
	for _, row := range rows {
		if row == nil {
			continue
		}
		if _, ok := out[row.NodeName]; ok {
			continue
		}
		out[row.NodeName] = row.Remark
	}
	return out, nil
}

func (s *serviceImpl) record(ctx context.Context, clusterID int64, name string, action Action, operator string, remark string, result Result) error {
	if _, err := dao.OpsNodeEvent.Ctx(ctx).Data(do.OpsNodeEvent{
		ClusterId: clusterID,
		NodeName:  name,
		Action:    string(action),
		Operator:  strings.TrimSpace(operator),
		Remark:    remark,
		Result:    string(result),
	}).Insert(); err != nil {
		return gerror.Wrap(err, "insert node event")
	}
	return nil
}

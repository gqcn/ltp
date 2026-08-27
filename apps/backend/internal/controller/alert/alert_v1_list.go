// 本文件实现告警列表处理。

package alert

import (
	"context"

	v1 "github.com/gqcn/ltp/api/alert/v1"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

// List 返回分页告警。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.alertSvc.List(ctx, alertsvc.ListInput{
		ClusterID: req.ClusterId,
		PageNum:   req.PageNum,
		PageSize:  req.PageSize,
		Keyword:   req.Keyword,
		Severity:  alertsvc.Severity(req.Severity),
		Status:    alertsvc.Status(req.Status),
		Range:     alertsvc.Range(req.Range),
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, toListItem(item))
	}
	return &v1.ListRes{
		List:  items,
		Total: out.Total,
		Summary: v1.ListSummary{
			Total:      out.Summary.Total,
			Open:       out.Summary.Open,
			Following:  out.Summary.Following,
			Handled:    out.Summary.Handled,
			Critical:   out.Summary.Critical,
			Warning:    out.Summary.Warning,
			Info:       out.Summary.Info,
			Unfinished: out.Summary.Unfinished,
		},
	}, nil
}

// 本文件实现训练任务关联告警列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// ListJobAlerts 列出关联告警。
func (c *ControllerV1) ListJobAlerts(ctx context.Context, req *v1.ListJobAlertsReq) (*v1.ListJobAlertsRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	alerts, err := c.jobSvc.ListAlerts(ctx, actor, req.Id)
	if err != nil {
		return nil, err
	}
	list := make([]*v1.RelatedAlert, 0, len(alerts))
	for _, a := range alerts {
		list = append(list, &v1.RelatedAlert{
			Id:        a.ID,
			DisplayId: a.DisplayID,
			Severity:  a.Severity,
			Title:     a.Title,
			Status:    a.Status,
			NodeNames: a.NodeNames,
			CreatedAt: a.CreatedAt,
		})
	}
	return &v1.ListJobAlertsRes{List: list}, nil
}

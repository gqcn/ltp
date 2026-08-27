// 本文件实现单条告警处理。

package alert

import (
	"context"

	v1 "github.com/gqcn/ltp/api/alert/v1"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

// UpdateStatus 处理单条告警。
func (c *ControllerV1) UpdateStatus(ctx context.Context, req *v1.UpdateStatusReq) (res *v1.UpdateStatusRes, err error) {
	err = c.alertSvc.Handle(ctx, alertsvc.HandleInput{
		IDs:      []int64{req.Id},
		Status:   alertsvc.Status(req.Status),
		Remark:   req.Remark,
		Operator: c.operator(ctx),
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateStatusRes{}, nil
}

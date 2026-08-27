// 本文件实现批量告警处理。

package alert

import (
	"context"

	v1 "github.com/gqcn/ltp/api/alert/v1"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

// BatchUpdateStatus 批量处理告警。
func (c *ControllerV1) BatchUpdateStatus(ctx context.Context, req *v1.BatchUpdateStatusReq) (res *v1.BatchUpdateStatusRes, err error) {
	err = c.alertSvc.Handle(ctx, alertsvc.HandleInput{
		IDs:      req.Ids,
		Status:   alertsvc.Status(req.Status),
		Remark:   req.Remark,
		Operator: c.operator(ctx),
	})
	if err != nil {
		return nil, err
	}
	return &v1.BatchUpdateStatusRes{}, nil
}

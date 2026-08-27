// 本文件实现告警详情处理。

package alert

import (
	"context"

	v1 "github.com/gqcn/ltp/api/alert/v1"
)

// Get 返回告警详情。
func (c *ControllerV1) Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error) {
	item, err := c.alertSvc.Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.GetRes{
		ListItem:       *toListItem(item),
		AlarmCount:     item.AlarmCount,
		AlarmLevel:     item.AlarmLevel,
		CreateUser:     item.CreateUser,
		WebhookPayload: item.Payload,
	}, nil
}

// 本文件实现队列详情处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
)

// Get 返回队列详情。
func (c *ControllerV1) Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error) {
	item, err := c.queueSvc.Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	dto := toListItem(item)
	if err := c.attachGPUHours(ctx, item.ClusterID, []*v1.ListItem{dto}); err != nil {
		return nil, err
	}
	return &v1.GetRes{ListItem: *dto}, nil
}

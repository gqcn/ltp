// 本文件实现队列启停处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
)

// UpdateStatus 启用或禁用队列。
func (c *ControllerV1) UpdateStatus(ctx context.Context, req *v1.UpdateStatusReq) (res *v1.UpdateStatusRes, err error) {
	if err := c.queueSvc.UpdateStatus(ctx, req.Id, req.Enabled); err != nil {
		return nil, err
	}
	return &v1.UpdateStatusRes{}, nil
}

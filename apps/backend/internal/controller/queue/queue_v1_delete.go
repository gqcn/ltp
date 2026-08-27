// 本文件实现删除队列处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
)

// Delete 删除队列。
func (c *ControllerV1) Delete(ctx context.Context, req *v1.DeleteReq) (res *v1.DeleteRes, err error) {
	if err := c.queueSvc.Delete(ctx, req.Id); err != nil {
		return nil, err
	}
	return &v1.DeleteRes{}, nil
}

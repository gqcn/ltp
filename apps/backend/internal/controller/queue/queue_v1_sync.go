// 本文件实现将业务队列重新写入 Volcano Queue。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
)

// Sync 按库中元数据创建或更新 Volcano Queue。
func (c *ControllerV1) Sync(ctx context.Context, req *v1.SyncReq) (res *v1.SyncRes, err error) {
	if err := c.queueSvc.Resync(ctx, req.Id); err != nil {
		return nil, err
	}
	return &v1.SyncRes{}, nil
}

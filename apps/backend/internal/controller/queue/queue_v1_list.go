// 本文件实现队列列表处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

// List 返回分页队列。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.queueSvc.List(ctx, queuesvc.ListInput{
		ClusterID:      req.ClusterId,
		PageNum:        req.PageNum,
		PageSize:       req.PageSize,
		Keyword:        req.Keyword,
		DatacenterCode: req.DatacenterCode,
		GPUType:        req.GpuType,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, toListItem(item))
	}
	return &v1.ListRes{List: items, Total: out.Total}, nil
}

// 本文件实现集群详情处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
)

// Get 返回集群详情。
func (c *ControllerV1) Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error) {
	item, err := c.clusterSvc.Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.GetRes{ListItem: *toListItem(item)}, nil
}

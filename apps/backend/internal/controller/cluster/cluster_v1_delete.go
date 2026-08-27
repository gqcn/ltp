// 本文件实现删除集群处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
)

// Delete 软删除集群。
func (c *ControllerV1) Delete(ctx context.Context, req *v1.DeleteReq) (res *v1.DeleteRes, err error) {
	if err := c.clusterSvc.Delete(ctx, req.Id); err != nil {
		return nil, err
	}
	return &v1.DeleteRes{}, nil
}

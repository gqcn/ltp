// 本文件实现编辑集群处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
)

// Update 保存集群展示信息。
func (c *ControllerV1) Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error) {
	err = c.clusterSvc.Update(ctx, clustersvc.UpdateInput{
		ID:          req.Id,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Kubeconfig:  req.Kubeconfig,
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateRes{}, nil
}

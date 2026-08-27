// 本文件实现接入集群处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
)

// Create 接入集群。
func (c *ControllerV1) Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error) {
	id, err := c.clusterSvc.Create(ctx, clustersvc.CreateInput{
		DisplayName: req.DisplayName,
		Description: req.Description,
		Kubeconfig:  req.Kubeconfig,
	})
	if err != nil {
		return nil, err
	}
	return &v1.CreateRes{Id: id}, nil
}

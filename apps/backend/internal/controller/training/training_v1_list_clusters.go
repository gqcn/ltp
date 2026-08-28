// 本文件实现训练中心工作集群列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/cluster"
)

// ListClusters 返回训练工作集群精简列表。
func (c *ControllerV1) ListClusters(ctx context.Context, _ *v1.ListClustersReq) (*v1.ListClustersRes, error) {
	out, err := c.clusterSvc.List(ctx, cluster.ListInput{PageNum: 1, PageSize: 100})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.ClusterItem, 0, len(out.List))
	for _, item := range out.List {
		if item == nil {
			continue
		}
		list = append(list, &v1.ClusterItem{
			Id:          item.ID,
			Name:        item.Name,
			DisplayName: item.DisplayName,
			Status:      string(item.Status),
		})
	}
	return &v1.ListClustersRes{List: list}, nil
}

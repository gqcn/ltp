// 本文件实现集群列表处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
)

// List 返回分页集群。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.clusterSvc.List(ctx, clustersvc.ListInput{
		PageNum:  req.PageNum,
		PageSize: req.PageSize,
		Keyword:  req.Keyword,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, toListItem(item))
	}
	return &v1.ListRes{
		List:  items,
		Total: out.Total,
		Summary: v1.ListSummary{
			Total:      out.Summary.Total,
			Healthy:    out.Summary.Healthy,
			ReadyNodes: out.Summary.ReadyNodes,
			TotalNodes: out.Summary.TotalNodes,
			GPUTotal:   out.Summary.GPUTotal,
		},
	}, nil
}

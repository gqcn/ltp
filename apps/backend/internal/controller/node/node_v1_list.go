// 本文件实现节点列表处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// List 返回工作集群节点分页。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.nodeSvc.List(ctx, nodesvc.ListInput{
		ClusterID:  req.ClusterId,
		PageNum:    req.PageNum,
		PageSize:   req.PageSize,
		Keyword:    req.Keyword,
		Datacenter: req.Datacenter,
		Status:     nodesvc.StatusFilter(req.Status),
		GPUType:    req.GpuType,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		taints := make([]v1.TaintItem, 0, len(item.Taints))
		for _, t := range item.Taints {
			taints = append(taints, v1.TaintItem{Key: t.Key, Value: t.Value, Effect: t.Effect})
		}
		items = append(items, &v1.ListItem{
			Name:          item.Name,
			IP:            item.IP,
			Roles:         item.Roles,
			Ready:         item.Ready,
			Schedulable:   item.Schedulable,
			Status:        item.Status,
			Datacenter:    item.Datacenter,
			GPUType:       item.GPUType,
			HasIB:         item.HasIB,
			IBDomain:      item.IBDomain,
			Isolated:      item.Isolated,
			IsolateRemark: item.IsolateRemark,
			PodCount:      item.PodCount,
			PodCapacity:   item.PodCapacity,
			GPUUsed:       item.GPUUsed,
			GPUTotal:      item.GPUTotal,
			CPUUsedMilli:  item.CPUUsedMilli,
			CPUTotalMilli: item.CPUTotalMilli,
			MemUsedBytes:  item.MemUsedBytes,
			MemTotalBytes: item.MemTotalBytes,
			Conditions:    item.Conditions,
			Labels:        item.Labels,
			Taints:        taints,
		})
	}
	return &v1.ListRes{
		List:  items,
		Total: out.Total,
		Summary: v1.ListSummary{
			Total:         out.Summary.Total,
			Ready:         out.Summary.Ready,
			NotReady:      out.Summary.NotReady,
			Unschedulable: out.Summary.Unschedulable,
			UnsetDc:       out.Summary.UnsetDc,
		},
		GpuTypes: out.GPUTypes,
	}, nil
}

// 本文件把集群服务投影转换为 API DTO。

package cluster

import (
	v1 "github.com/gqcn/ltp/api/cluster/v1"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
)

func toListItem(item *clustersvc.Item) *v1.ListItem {
	dcs := make([]v1.DatacenterRef, 0, len(item.Datacenters))
	for _, dc := range item.Datacenters {
		dcs = append(dcs, v1.DatacenterRef{
			Code:      dc.Code,
			Name:      dc.Name,
			ShortName: dc.ShortName,
			Color:     dc.Color,
		})
	}
	gpus := make([]v1.GPUTypeUsage, 0, len(item.GPUByType))
	for _, gpu := range item.GPUByType {
		gpus = append(gpus, v1.GPUTypeUsage{Type: gpu.Type, Used: gpu.Used, Total: gpu.Total})
	}
	return &v1.ListItem{
		Id:            item.ID,
		Name:          item.Name,
		DisplayName:   item.DisplayName,
		Description:   item.Description,
		ApiServer:     item.APIServer,
		Version:       item.Version,
		Status:        string(item.Status),
		Datacenters:   dcs,
		NodesReady:    item.NodesReady,
		NodesTotal:    item.NodesTotal,
		GPU:           v1.ResourceUsage{Used: item.GPU.Used, Total: item.GPU.Total, Unit: item.GPU.Unit},
		CPU:           v1.ResourceUsage{Used: item.CPU.Used, Total: item.CPU.Total, Unit: item.CPU.Unit},
		Memory:        v1.ResourceUsage{Used: item.Memory.Used, Total: item.Memory.Total, Unit: item.Memory.Unit},
		GPUByType:     gpus,
		KubeconfigSet: item.KubeconfigSet,
		LastSyncAt:    item.LastSyncAt,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

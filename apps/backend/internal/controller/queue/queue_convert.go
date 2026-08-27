// 本文件把队列服务投影转换为 API DTO。

package queue

import (
	v1 "github.com/gqcn/ltp/api/queue/v1"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

func toListItem(item *queuesvc.Item) *v1.ListItem {
	teams := make([]v1.TeamRef, 0, len(item.Teams))
	for _, t := range item.Teams {
		teams = append(teams, v1.TeamRef{Id: t.ID, Name: t.Name})
	}
	return &v1.ListItem{
		Id:             item.ID,
		ClusterId:      item.ClusterID,
		Name:           item.Name,
		DisplayName:    item.DisplayName,
		Description:    item.Description,
		DatacenterCode: item.DatacenterCode,
		GpuType:        item.GPUType,
		GpuQuota:       item.GPUQuota,
		GpuUsed:        item.GPUUsed,
		CpuQuota:       item.CPUQuota,
		CpuUsed:        item.CPUUsed,
		MemQuotaGi:     item.MemQuotaGi,
		MemUsedGi:      item.MemUsedGi,
		Weight:         item.Weight,
		Reclaimable:    item.Reclaimable,
		Features:       item.Features,
		Enabled:        item.Enabled,
		State:          item.State,
		Pending:        item.Pending,
		Running:        item.Running,
		SyncError:      item.SyncError,
		Teams:          teams,
		CreatedAt:      item.CreatedAt,
		UpdatedAt:      item.UpdatedAt,
	}
}

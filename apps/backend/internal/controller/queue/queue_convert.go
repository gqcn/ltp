// 本文件把队列服务投影转换为 API DTO。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

// toListItem 把服务投影转成列表 DTO。本月卡时由 attachGPUHours 另行写入。
func toListItem(item *queuesvc.Item) *v1.ListItem {
	teams := make([]v1.TeamRef, 0, len(item.Teams))
	for _, t := range item.Teams {
		teams = append(teams, v1.TeamRef{Id: t.ID, Name: t.Name})
	}
	return &v1.ListItem{
		Id:                  item.ID,
		ClusterId:           item.ClusterID,
		Name:                item.Name,
		DisplayName:         item.DisplayName,
		Description:         item.Description,
		DatacenterCode:      item.DatacenterCode,
		DatacenterName:      item.DatacenterName,
		DatacenterShortName: item.DatacenterShortName,
		DatacenterColor:     item.DatacenterColor,
		GpuType:             item.GPUType,
		GpuQuota:            item.GPUQuota,
		GpuUsed:             item.GPUUsed,
		CpuQuota:            item.CPUQuota,
		CpuUsed:             item.CPUUsed,
		MemQuotaGi:          item.MemQuotaGi,
		MemUsedGi:           item.MemUsedGi,
		Weight:              item.Weight,
		Reclaimable:         item.Reclaimable,
		Features:            item.Features,
		Enabled:             item.Enabled,
		State:               item.State,
		Pending:             item.Pending,
		Running:             item.Running,
		SyncError:           item.SyncError,
		Teams:               teams,
		CreatedAt:           item.CreatedAt,
		UpdatedAt:           item.UpdatedAt,
	}
}

// attachGPUHours 按当前页队列批量写入本月卡时。jobSvc 为 nil 时保持 0。
func (c *ControllerV1) attachGPUHours(ctx context.Context, clusterID int64, items []*v1.ListItem) error {
	if c.jobSvc == nil || len(items) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(items))
	for _, item := range items {
		if item != nil {
			ids = append(ids, item.Id)
		}
	}
	hours, err := c.jobSvc.GPUHoursMonthByQueueIDs(ctx, clusterID, ids)
	if err != nil {
		return err
	}
	for _, item := range items {
		if item != nil {
			item.GpuHoursMonth = hours[item.Id]
		}
	}
	return nil
}

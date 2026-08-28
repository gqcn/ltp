// 本文件实现「我的队列」列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// ListMyQueues 返回我的队列。
func (c *ControllerV1) ListMyQueues(ctx context.Context, req *v1.ListMyQueuesReq) (*v1.ListMyQueuesRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.jobSvc.ListMyQueues(ctx, actor, req.ClusterId)
	if err != nil {
		return nil, err
	}
	list := make([]*v1.MyQueueItem, 0, len(out.List))
	for _, q := range out.List {
		teams := make([]v1.TeamItem, 0, len(q.Teams))
		for _, t := range q.Teams {
			teams = append(teams, v1.TeamItem{Id: t.ID, Name: t.Name})
		}
		jobs := make([]*v1.MyQueueJob, 0, len(q.ActiveJobs))
		for _, j := range q.ActiveJobs {
			jobs = append(jobs, &v1.MyQueueJob{
				Id:            j.ID,
				Name:          j.Name,
				Status:        j.Status,
				Priority:      j.Priority,
				GpuCount:      j.GPUCount,
				GpuType:       j.GPUType,
				CpuTotal:      j.CPUTotal,
				MemGiTotal:    j.MemGiTotal,
				OwnerNickname: j.OwnerNickname,
				GpuHours:      j.GPUHours,
				DurationMs:    j.DurationMs,
			})
		}
		list = append(list, &v1.MyQueueItem{
			Id:             q.ID,
			Name:           q.Name,
			DisplayName:    q.DisplayName,
			DatacenterCode: q.DatacenterCode,
			GpuType:        q.GPUType,
			GpuQuota:       q.GPUQuota,
			GpuUsed:        q.GPUUsed,
			CpuQuota:       q.CPUQuota,
			CpuUsed:        q.CPUUsed,
			MemQuotaGi:     q.MemQuotaGi,
			MemUsedGi:      q.MemUsedGi,
			Features:       q.Features,
			Enabled:        q.Enabled,
			State:          q.State,
			SyncError:      q.SyncError,
			Teams:          teams,
			GpuHoursMonth:  q.GPUHoursMonth,
			Running:        q.Running,
			Pending:        q.Pending,
			ActiveJobs:     jobs,
		})
	}
	return &v1.ListMyQueuesRes{
		Summary: v1.MyQueueSummary{
			GpuQuota:        out.Summary.GPUQuota,
			GpuUsed:         out.Summary.GPUUsed,
			CpuQuota:        out.Summary.CPUQuota,
			CpuUsed:         out.Summary.CPUUsed,
			MemQuotaGi:      out.Summary.MemQuotaGi,
			MemUsedGi:       out.Summary.MemUsedGi,
			GpuHoursMonth:   out.Summary.GPUHoursMonth,
			GpuHoursRunning: out.Summary.GPUHoursRunning,
			Running:         out.Summary.Running,
			Pending:         out.Summary.Pending,
		},
		List: list,
	}, nil
}

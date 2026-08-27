// 本文件实现编辑队列处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

// Update 更新队列并同步 Volcano Queue。
func (c *ControllerV1) Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error) {
	err = c.queueSvc.Update(ctx, req.Id, queuesvc.WriteInput{
		DisplayName:    req.DisplayName,
		DatacenterCode: req.DatacenterCode,
		GPUType:        req.GpuType,
		GPUQuota:       req.GpuQuota,
		CPUQuota:       req.CpuQuota,
		MemQuotaGi:     req.MemQuotaGi,
		TeamIDs:        req.TeamIds,
		Features:       req.Features,
		Weight:         req.Weight,
		Reclaimable:    req.Reclaimable,
		Description:    req.Description,
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateRes{}, nil
}

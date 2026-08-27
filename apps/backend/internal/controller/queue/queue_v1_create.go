// 本文件实现创建队列处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
	queuesvc "github.com/gqcn/ltp/internal/service/queue"
)

// Create 创建业务队列并同步 Volcano Queue。
func (c *ControllerV1) Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error) {
	id, err := c.queueSvc.Create(ctx, queuesvc.WriteInput{
		ClusterID:      req.ClusterId,
		Name:           req.Name,
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
	return &v1.CreateRes{Id: id}, nil
}

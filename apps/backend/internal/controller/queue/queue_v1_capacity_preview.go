// 本文件实现队列额度预览处理。

package queue

import (
	"context"

	v1 "github.com/gqcn/ltp/api/queue/v1"
)

// CapacityPreview 返回数据中心容量与已分配额度。
func (c *ControllerV1) CapacityPreview(ctx context.Context, req *v1.CapacityPreviewReq) (res *v1.CapacityPreviewRes, err error) {
	out, err := c.queueSvc.CapacityPreview(ctx, req.ClusterId, req.DatacenterCode, req.Features, req.ExcludeQueueId)
	if err != nil {
		return nil, err
	}
	types := make([]v1.GPUTypeCapacity, 0, len(out.GPUTypes))
	for _, item := range out.GPUTypes {
		types = append(types, v1.GPUTypeCapacity{
			Type:      item.Type,
			Total:     item.Total,
			Allocated: item.Allocated,
			HasIB:     item.HasIB,
		})
	}
	return &v1.CapacityPreviewRes{
		GpuTypes:     types,
		CpuTotal:     out.CPUTotal,
		CpuAllocated: out.CPUAllocated,
		MemTotalGi:   out.MemTotalGi,
		MemAllocated: out.MemAllocated,
	}, nil
}

// 本文件预览隔离节点对队列额度的影响。

package node

import (
	"context"

	"github.com/gqcn/ltp/internal/service/queue"
)

// PreviewIsolateQuotaImpact 预览隔离指定节点后对队列额度的影响。
func (s *serviceImpl) PreviewIsolateQuotaImpact(ctx context.Context, clusterID int64, names []string) (*QuotaImpact, error) {
	empty := &QuotaImpact{Datacenters: []QuotaImpactDC{}}
	normalized, err := normalizeNames(names)
	if err != nil {
		return nil, err
	}
	client, err := s.clusterSvc.Client(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	if err := ensureNodesExist(ctx, client, normalized); err != nil {
		return nil, err
	}
	if s.queueSvc == nil {
		return empty, nil
	}
	src, err := s.queueSvc.PreviewUnschedulableQuotaImpact(ctx, clusterID, normalized)
	if err != nil {
		return nil, err
	}
	return mapQuotaImpact(src), nil
}

func mapQuotaImpact(src *queue.QuotaImpact) *QuotaImpact {
	if src == nil {
		return &QuotaImpact{Datacenters: []QuotaImpactDC{}}
	}
	out := &QuotaImpact{
		Changed:       src.Changed,
		OverAllocated: src.OverAllocated,
		Datacenters:   make([]QuotaImpactDC, 0, len(src.Datacenters)),
	}
	for _, dc := range src.Datacenters {
		item := QuotaImpactDC{
			DatacenterCode: dc.DatacenterCode,
			CPUCurrent:     dc.CPUCurrent,
			CPUAfter:       dc.CPUAfter,
			CPUAllocated:   dc.CPUAllocated,
			MemCurrentGi:   dc.MemCurrentGi,
			MemAfterGi:     dc.MemAfterGi,
			MemAllocated:   dc.MemAllocated,
			GPUTypes:       make([]QuotaImpactGPU, 0, len(dc.GPUTypes)),
		}
		for _, gpu := range dc.GPUTypes {
			item.GPUTypes = append(item.GPUTypes, QuotaImpactGPU{
				Type:      gpu.Type,
				Current:   gpu.Current,
				After:     gpu.After,
				Allocated: gpu.Allocated,
			})
		}
		out.Datacenters = append(out.Datacenters, item)
	}
	return out
}

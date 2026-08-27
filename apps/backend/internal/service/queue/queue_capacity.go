// 本文件按数据中心聚合节点容量与其他队列已分配额度。

package queue

import (
	"context"
	"fmt"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
)

const giB = 1024 * 1024 * 1024

// CapacityPreview 返回指定数据中心的物理容量与已分配额度。
func (s *serviceImpl) CapacityPreview(ctx context.Context, clusterID int64, datacenterCode string, features []string, excludeID int64) (*CapacityPreview, error) {
	code := strings.TrimSpace(datacenterCode)
	if code == "" {
		return nil, errInvalid("请选择数据中心")
	}
	client, err := s.clusterSvc.Client(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	snaps, err := client.ListNodes(ctx)
	if err != nil {
		return nil, err
	}
	wantIB := hasIBFeature(features)
	byType := map[string]*GPUTypeCapacity{}
	var cpuTotal int64
	var memTotal int64
	for _, snap := range snaps {
		if strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter]) != code {
			continue
		}
		nodeIB := snap.Labels[consts.LabelKeyIB] == "true" || strings.TrimSpace(snap.Labels[consts.LabelKeyIBDomain]) != ""
		if wantIB && !nodeIB {
			continue
		}
		gpuType := nodeGPUType(snap.Labels)
		if gpuType != "" {
			cur := byType[gpuType]
			if cur == nil {
				cur = &GPUTypeCapacity{Type: gpuType}
				byType[gpuType] = cur
			}
			cur.Total += snap.GPUTotal
			if nodeIB {
				cur.HasIB = true
			}
		}
		cpuTotal += snap.CPUTotalMilli / 1000
		memTotal += snap.MemTotalBytes / giB
	}
	peers, err := s.peerQueues(ctx, clusterID, code, excludeID)
	if err != nil {
		return nil, err
	}
	var cpuAlloc int
	var memAlloc int
	for _, peer := range peers {
		if wantIB && !hasIBFeature(parseFeatures(peer.Features)) {
			continue
		}
		cpuAlloc += peer.CpuQuota
		memAlloc += peer.MemQuotaGi
		gpuType := strings.TrimSpace(peer.GpuType)
		cur := byType[gpuType]
		if cur == nil {
			continue
		}
		cur.Allocated += peer.GpuQuota
	}
	out := &CapacityPreview{
		GPUTypes:     make([]GPUTypeCapacity, 0, len(byType)),
		CPUTotal:     cpuTotal,
		CPUAllocated: cpuAlloc,
		MemTotalGi:   memTotal,
		MemAllocated: memAlloc,
	}
	for _, item := range byType {
		out.GPUTypes = append(out.GPUTypes, *item)
	}
	return out, nil
}

// ensureQuotaFits 拒绝超过数据中心剩余容量的额度。剩余 = 节点物理总量 − 其他队列已声明额度。
func (s *serviceImpl) ensureQuotaFits(ctx context.Context, clusterID int64, datacenterCode string, features []string, gpuType string, gpuQuota, cpuQuota, memQuotaGi int, excludeID int64) error {
	preview, err := s.CapacityPreview(ctx, clusterID, datacenterCode, features, excludeID)
	if err != nil {
		return err
	}
	var gpuRemain int64
	for _, item := range preview.GPUTypes {
		if item.Type == gpuType {
			gpuRemain = remainCapacity(item.Total, item.Allocated)
			break
		}
	}
	if int64(gpuQuota) > gpuRemain {
		return errInvalid(fmt.Sprintf("GPU 额度超过剩余容量（剩余 %d 卡）", gpuRemain))
	}
	cpuRemain := remainCapacity(preview.CPUTotal, preview.CPUAllocated)
	if int64(cpuQuota) > cpuRemain {
		return errInvalid(fmt.Sprintf("CPU 额度超过剩余容量（剩余 %d 核）", cpuRemain))
	}
	memRemain := remainCapacity(preview.MemTotalGi, preview.MemAllocated)
	if int64(memQuotaGi) > memRemain {
		return errInvalid(fmt.Sprintf("内存额度超过剩余容量（剩余 %d Gi）", memRemain))
	}
	return nil
}

func remainCapacity(total int64, allocated int) int64 {
	remain := total - int64(allocated)
	if remain < 0 {
		return 0
	}
	return remain
}

func (s *serviceImpl) peerQueues(ctx context.Context, clusterID int64, code string, excludeID int64) ([]*entity.OpsQueue, error) {
	mod := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{ClusterId: clusterID, DatacenterCode: code})
	if excludeID > 0 {
		mod = mod.WhereNot(dao.OpsQueue.Columns().Id, excludeID)
	}
	var rows []*entity.OpsQueue
	if err := mod.Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list peer queues")
	}
	return rows, nil
}

// nodeGPUType 读取节点卡型号标签；无标签时返回空，不得用 cpu 占位。
func nodeGPUType(labels map[string]string) string {
	if labels == nil {
		return ""
	}
	if v := strings.TrimSpace(labels[consts.LabelKeyGPUType]); v != "" {
		return v
	}
	return strings.TrimSpace(labels["nvidia.com/gpu.product"])
}

func hasIBFeature(features []string) bool {
	for _, item := range features {
		if item == featureIB {
			return true
		}
	}
	return false
}

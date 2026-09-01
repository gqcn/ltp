// 本文件按数据中心聚合可调度节点容量与其他队列已分配额度。

package queue

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
)

const giB = 1024 * 1024 * 1024

// dcCapacity 是一个数据中心的可调度容量。
type dcCapacity struct {
	cpu int64            // CPU 核
	mem int64            // 内存 GiB
	gpu map[string]int64 // 卡型号 → 卡数
}

// dcAllocated 是一个数据中心的已划分额度。
type dcAllocated struct {
	cpu int            // CPU 核
	mem int            // 内存 GiB
	gpu map[string]int // 卡型号 → 卡数
}

// CapacityPreview 返回指定数据中心的物理容量与已分配额度。总量只统计可调度且未隔离的节点。
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
		if !countsTowardCapacity(snap) {
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

// PreviewUnschedulableQuotaImpact 预览将指定节点视为不可调度后的额度变化。
func (s *serviceImpl) PreviewUnschedulableQuotaImpact(ctx context.Context, clusterID int64, names []string) (*QuotaImpact, error) {
	empty := &QuotaImpact{Datacenters: []QuotaImpactDC{}}
	skip := map[string]struct{}{}
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		skip[name] = struct{}{}
	}
	if len(skip) == 0 {
		return empty, nil
	}
	client, err := s.clusterSvc.Client(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	snaps, err := client.ListNodes(ctx)
	if err != nil {
		return nil, err
	}
	affected := map[string]struct{}{}
	for _, snap := range snaps {
		if _, hit := skip[snap.Name]; !hit {
			continue
		}
		if !countsTowardCapacity(snap) {
			continue
		}
		code := strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter])
		if code == "" {
			continue
		}
		affected[code] = struct{}{}
	}
	if len(affected) == 0 {
		return empty, nil
	}
	codes := make([]string, 0, len(affected))
	for code := range affected {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	current := sumCapacity(snaps, nil)
	after := sumCapacity(snaps, skip)
	alloc, err := s.allocatedByDatacenter(ctx, clusterID, codes)
	if err != nil {
		return nil, err
	}

	out := &QuotaImpact{Datacenters: make([]QuotaImpactDC, 0, len(codes))}
	for _, code := range codes {
		cur := current[code]
		nxt := after[code]
		if cur == nil {
			cur = &dcCapacity{gpu: map[string]int64{}}
		}
		if nxt == nil {
			nxt = &dcCapacity{gpu: map[string]int64{}}
		}
		a := alloc[code]
		if a.gpu == nil {
			a.gpu = map[string]int{}
		}
		item := QuotaImpactDC{
			DatacenterCode: code,
			CPUCurrent:     cur.cpu,
			CPUAfter:       nxt.cpu,
			CPUAllocated:   a.cpu,
			MemCurrentGi:   cur.mem,
			MemAfterGi:     nxt.mem,
			MemAllocated:   a.mem,
			GPUTypes:       make([]QuotaImpactGPU, 0),
		}
		typeSet := map[string]struct{}{}
		for gpuType := range cur.gpu {
			typeSet[gpuType] = struct{}{}
		}
		for gpuType := range nxt.gpu {
			typeSet[gpuType] = struct{}{}
		}
		gpuTypes := make([]string, 0, len(typeSet))
		for gpuType := range typeSet {
			gpuTypes = append(gpuTypes, gpuType)
		}
		sort.Strings(gpuTypes)
		changed := cur.cpu != nxt.cpu || cur.mem != nxt.mem
		for _, gpuType := range gpuTypes {
			gCur := cur.gpu[gpuType]
			gNxt := nxt.gpu[gpuType]
			if gCur == gNxt {
				continue
			}
			changed = true
			gpuAlloc := a.gpu[gpuType]
			item.GPUTypes = append(item.GPUTypes, QuotaImpactGPU{
				Type:      gpuType,
				Current:   gCur,
				After:     gNxt,
				Allocated: gpuAlloc,
			})
			if gNxt < int64(gpuAlloc) {
				out.OverAllocated = true
			}
		}
		if nxt.cpu < int64(a.cpu) || nxt.mem < int64(a.mem) {
			out.OverAllocated = true
		}
		if !changed {
			continue
		}
		out.Changed = true
		out.Datacenters = append(out.Datacenters, item)
	}
	return out, nil
}

// ensureQuotaFits 拒绝超过数据中心剩余容量的额度。剩余 = 可调度未隔离节点总量 − 其他队列已声明额度。
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

func (s *serviceImpl) allocatedByDatacenter(ctx context.Context, clusterID int64, codes []string) (map[string]dcAllocated, error) {
	out := make(map[string]dcAllocated, len(codes))
	for _, code := range codes {
		out[code] = dcAllocated{gpu: map[string]int{}}
	}
	if len(codes) == 0 {
		return out, nil
	}
	var rows []*entity.OpsQueue
	if err := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{ClusterId: clusterID}).WhereIn(dao.OpsQueue.Columns().DatacenterCode, codes).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list queues for quota impact")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		cur, ok := out[row.DatacenterCode]
		if !ok {
			continue
		}
		cur.cpu += row.CpuQuota
		cur.mem += row.MemQuotaGi
		gpuType := strings.TrimSpace(row.GpuType)
		if gpuType != "" {
			cur.gpu[gpuType] += row.GpuQuota
		}
		out[row.DatacenterCode] = cur
	}
	return out, nil
}

func sumCapacity(snaps []kube.NodeSnapshot, skip map[string]struct{}) map[string]*dcCapacity {
	out := map[string]*dcCapacity{}
	for _, snap := range snaps {
		if !countsTowardCapacity(snap) {
			continue
		}
		if _, hit := skip[snap.Name]; hit {
			continue
		}
		code := strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter])
		if code == "" {
			continue
		}
		cur := out[code]
		if cur == nil {
			cur = &dcCapacity{gpu: map[string]int64{}}
			out[code] = cur
		}
		cur.cpu += snap.CPUTotalMilli / 1000
		cur.mem += snap.MemTotalBytes / giB
		gpuType := nodeGPUType(snap.Labels)
		if gpuType != "" {
			cur.gpu[gpuType] += snap.GPUTotal
		}
	}
	return out
}

func countsTowardCapacity(snap kube.NodeSnapshot) bool {
	if !snap.Schedulable || nodeIsolated(snap) {
		return false
	}
	if snap.Labels == nil {
		return false
	}
	return strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter]) != ""
}

func nodeIsolated(snap kube.NodeSnapshot) bool {
	if snap.Labels != nil && snap.Labels[consts.LabelKeyFault] == "true" {
		return true
	}
	for _, t := range snap.Taints {
		if t.Key == consts.TaintKeyFault {
			return true
		}
	}
	return false
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

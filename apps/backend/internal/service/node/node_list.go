// 本文件从工作集群实时列出节点并做筛选分页。

package node

import (
	"context"
	"sort"
	"strings"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/service/kube"
)

// List 从工作集群实时列出节点。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return nil, err
	}
	snaps, err := client.ListNodes(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]*Item, 0, len(snaps))
	gpuSet := map[string]struct{}{}
	summary := Summary{Total: len(snaps)}
	for _, snap := range snaps {
		item := projectNode(snap)
		if item.GPUType != "" {
			gpuSet[item.GPUType] = struct{}{}
		}
		switch {
		case item.Status == string(StatusNotReady):
			summary.NotReady++
		case item.Status == string(StatusDisabled):
			summary.Unschedulable++
		default:
			if item.Ready && item.Schedulable {
				summary.Ready++
			}
		}
		if item.Datacenter == "" {
			summary.UnsetDc++
		}
		if matchNode(item, in) {
			items = append(items, item)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	gpuTypes := make([]string, 0, len(gpuSet))
	for t := range gpuSet {
		gpuTypes = append(gpuTypes, t)
	}
	sort.Strings(gpuTypes)
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	total := len(items)
	start := (pageNum - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	page := items[start:end]
	if err := s.attachIsolateRemarks(ctx, in.ClusterID, page); err != nil {
		return nil, err
	}
	return &ListOutput{
		List:     page,
		Total:    total,
		Summary:  summary,
		GPUTypes: gpuTypes,
	}, nil
}

func projectNode(snap kube.NodeSnapshot) *Item {
	dc := strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter])
	gpuType := strings.TrimSpace(snap.Labels[consts.LabelKeyGPUType])
	if gpuType == "" {
		gpuType = strings.TrimSpace(snap.Labels["nvidia.com/gpu.product"])
	}
	hasIB := snap.Labels[consts.LabelKeyIB] == "true" || strings.TrimSpace(snap.Labels[consts.LabelKeyIBDomain]) != ""
	isolated := hasFaultTaint(snap.Taints) || snap.Labels[consts.LabelKeyFault] == "true"
	status := string(StatusReady)
	switch {
	case !snap.Ready:
		status = string(StatusNotReady)
	case !snap.Schedulable || isolated:
		status = string(StatusDisabled)
	}
	roles := snap.Roles
	if roles == nil {
		roles = []string{}
	}
	conds := snap.Conditions
	if conds == nil {
		conds = []string{}
	}
	taints := snap.Taints
	if taints == nil {
		taints = []kube.Taint{}
	}
	labels := snap.Labels
	if labels == nil {
		labels = map[string]string{}
	}
	return &Item{
		Name:          snap.Name,
		IP:            snap.IP,
		Roles:         roles,
		Ready:         snap.Ready,
		Schedulable:   snap.Schedulable,
		Status:        status,
		Datacenter:    dc,
		GPUType:       gpuType,
		HasIB:         hasIB,
		IBDomain:      strings.TrimSpace(snap.Labels[consts.LabelKeyIBDomain]),
		Isolated:      isolated,
		PodCount:      snap.PodCount,
		PodCapacity:   snap.PodCapacity,
		GPUUsed:       snap.GPUUsed,
		GPUTotal:      snap.GPUTotal,
		CPUUsedMilli:  snap.CPUUsedMilli,
		CPUTotalMilli: snap.CPUTotalMilli,
		MemUsedBytes:  snap.MemUsedBytes,
		MemTotalBytes: snap.MemTotalBytes,
		Conditions:    conds,
		Labels:        labels,
		Taints:        taints,
	}
}

func matchNode(item *Item, in ListInput) bool {
	keyword := strings.ToLower(strings.TrimSpace(in.Keyword))
	if keyword != "" {
		if !strings.Contains(strings.ToLower(item.Name), keyword) && !strings.Contains(strings.ToLower(item.IP), keyword) {
			return false
		}
	}
	dc := strings.TrimSpace(in.Datacenter)
	switch dc {
	case "", "all":
	case "unset":
		if item.Datacenter != "" {
			return false
		}
	default:
		if item.Datacenter != dc {
			return false
		}
	}
	st := in.Status
	if st != "" && st != StatusAll && string(st) != item.Status {
		return false
	}
	gpu := strings.TrimSpace(in.GPUType)
	if gpu != "" && gpu != "all" && item.GPUType != gpu {
		return false
	}
	return true
}

func hasFaultTaint(taints []kube.Taint) bool {
	for _, t := range taints {
		if t.Key == consts.TaintKeyFault {
			return true
		}
	}
	return false
}

func normalizePage(pageNum int, pageSize int) (int, int) {
	if pageNum < 1 {
		pageNum = defaultListNum
	}
	if pageSize < 1 {
		pageSize = defaultPageSz
	}
	if pageSize > maxListSize {
		pageSize = maxListSize
	}
	return pageNum, pageSize
}

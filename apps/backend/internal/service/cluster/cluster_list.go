// 本文件实现集群列表、详情投影与数据中心关联计数。

package cluster

import (
	"context"
	"sort"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/logger"
)

// List 返回分页集群并装配实时用量。
func (s *serviceImpl) List(ctx context.Context, in ListInput) (*ListOutput, error) {
	pageNum, pageSize := normalizePage(in.PageNum, in.PageSize)
	total, err := s.listModel(ctx, in).Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count clusters")
	}
	var rows []*entity.OpsCluster
	if err := s.listModel(ctx, in).
		OrderDesc(dao.OpsCluster.Columns().Id).
		Page(pageNum, pageSize).
		Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list clusters")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return nil, err
	}
	summary, err := s.summary(ctx)
	if err != nil {
		return nil, err
	}
	return &ListOutput{List: items, Total: total, Summary: summary}, nil
}

// Get 返回集群详情。
func (s *serviceImpl) Get(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.projectOne(ctx, row)
}

// CountNodesByDatacenter 遍历已接入集群的节点标签进行聚合。
func (s *serviceImpl) CountNodesByDatacenter(ctx context.Context, codes []string) (map[string]int, map[string]int, error) {
	nodes := make(map[string]int, len(codes))
	clusters := make(map[string]int, len(codes))
	for _, code := range codes {
		nodes[code] = 0
		clusters[code] = 0
	}
	var rows []*entity.OpsCluster
	if err := dao.OpsCluster.Ctx(ctx).Scan(&rows); err != nil {
		return nil, nil, gerror.Wrap(err, "list clusters for usage")
	}
	for _, row := range rows {
		if row == nil {
			continue
		}
		snaps, err := s.listNodesQuiet(ctx, row)
		if err != nil {
			logger.Warningf(ctx, "skip cluster %d node count: %v", row.Id, err)
			continue
		}
		seen := map[string]struct{}{}
		for _, snap := range snaps {
			code := strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter])
			if code == "" {
				continue
			}
			nodes[code]++
			if _, ok := seen[code]; !ok {
				clusters[code]++
				seen[code] = struct{}{}
			}
		}
	}
	return nodes, clusters, nil
}

func (s *serviceImpl) summary(ctx context.Context) (Summary, error) {
	var rows []*entity.OpsCluster
	if err := dao.OpsCluster.Ctx(ctx).Scan(&rows); err != nil {
		return Summary{}, gerror.Wrap(err, "list clusters for summary")
	}
	items, err := s.projectItems(ctx, rows)
	if err != nil {
		return Summary{}, err
	}
	out := Summary{Total: len(items)}
	for _, item := range items {
		if item.Status == StatusHealthy {
			out.Healthy++
		}
		out.ReadyNodes += item.NodesReady
		out.TotalNodes += item.NodesTotal
		out.GPUTotal += item.GPU.Total
	}
	return out, nil
}

func (s *serviceImpl) listModel(ctx context.Context, in ListInput) *gdb.Model {
	cols := dao.OpsCluster.Columns()
	mod := dao.OpsCluster.Ctx(ctx)
	keyword := strings.TrimSpace(in.Keyword)
	if keyword == "" {
		return mod
	}
	pattern := "%" + keyword + "%"
	return mod.Where(
		mod.Builder().
			WhereLike(cols.Name, pattern).
			WhereOrLike(cols.DisplayName, pattern).
			WhereOrLike(cols.Description, pattern).
			WhereOrLike(cols.ApiServer, pattern),
	)
}

func (s *serviceImpl) projectItems(ctx context.Context, rows []*entity.OpsCluster) ([]*Item, error) {
	dcNames, err := loadDatacenterRefs(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]*Item, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		item := baseItem(row)
		snaps, liveErr := s.listNodesQuiet(ctx, row)
		if liveErr != nil {
			markOfflineWithoutWrite(item)
			logger.Warningf(ctx, "cluster %d live inventory: %v", row.Id, liveErr)
		} else {
			fillInventory(item, snaps, dcNames)
		}
		items = append(items, item)
	}
	return items, nil
}

func markOfflineWithoutWrite(item *Item) {
	if item.Status == StatusHealthy {
		item.Status = StatusOffline
	}
}

func baseItem(row *entity.OpsCluster) *Item {
	return &Item{
		ID:            row.Id,
		Name:          row.Name,
		DisplayName:   row.DisplayName,
		Description:   row.Description,
		APIServer:     row.ApiServer,
		Version:       row.K8SVersion,
		Status:        parseStatus(row.Status),
		Datacenters:   []DatacenterRef{},
		GPU:           ResourceUsage{Unit: "gpu"},
		CPU:           ResourceUsage{Unit: "milliCPU"},
		Memory:        ResourceUsage{Unit: "bytes"},
		GPUByType:     []GPUTypeUsage{},
		KubeconfigSet: strings.TrimSpace(row.Kubeconfig) != "",
		LastSyncAt:    model.UnixMilli(row.LastSyncAt),
		CreatedAt:     model.UnixMilli(row.CreatedAt),
		UpdatedAt:     model.UnixMilli(row.UpdatedAt),
	}
}

func fillInventory(item *Item, snaps []kube.NodeSnapshot, dcNames map[string]DatacenterRef) {
	item.NodesTotal = len(snaps)
	gpuByType := map[string]GPUTypeUsage{}
	dcSet := map[string]DatacenterRef{}
	for _, snap := range snaps {
		if snap.Ready {
			item.NodesReady++
		}
		item.GPU.Used += snap.GPUUsed
		item.GPU.Total += snap.GPUTotal
		item.CPU.Used += snap.CPUUsedMilli
		item.CPU.Total += snap.CPUTotalMilli
		item.Memory.Used += snap.MemUsedBytes
		item.Memory.Total += snap.MemTotalBytes
		gpuType := gpuTypeOf(snap)
		cur := gpuByType[gpuType]
		cur.Type = gpuType
		cur.Used += snap.GPUUsed
		cur.Total += snap.GPUTotal
		gpuByType[gpuType] = cur
		code := strings.TrimSpace(snap.Labels[consts.LabelKeyDatacenter])
		if code == "" {
			continue
		}
		if ref, ok := dcNames[code]; ok {
			dcSet[code] = ref
		} else {
			dcSet[code] = DatacenterRef{Code: code, Name: code, ShortName: code}
		}
	}
	item.GPUByType = make([]GPUTypeUsage, 0, len(gpuByType))
	for _, itemType := range gpuByType {
		item.GPUByType = append(item.GPUByType, itemType)
	}
	sort.Slice(item.GPUByType, func(i, j int) bool { return item.GPUByType[i].Type < item.GPUByType[j].Type })
	item.Datacenters = make([]DatacenterRef, 0, len(dcSet))
	for _, ref := range dcSet {
		item.Datacenters = append(item.Datacenters, ref)
	}
	sort.Slice(item.Datacenters, func(i, j int) bool { return item.Datacenters[i].Code < item.Datacenters[j].Code })
}

func gpuTypeOf(snap kube.NodeSnapshot) string {
	if v := strings.TrimSpace(snap.Labels[consts.LabelKeyGPUType]); v != "" {
		return v
	}
	if v := strings.TrimSpace(snap.Labels["nvidia.com/gpu.product"]); v != "" {
		return v
	}
	return ""
}

func loadDatacenterRefs(ctx context.Context) (map[string]DatacenterRef, error) {
	var rows []*entity.OpsDatacenter
	if err := dao.OpsDatacenter.Ctx(ctx).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "load datacenters for cluster projection")
	}
	out := make(map[string]DatacenterRef, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out[row.Code] = DatacenterRef{
			Code:      row.Code,
			Name:      row.Name,
			ShortName: row.ShortName,
			Color:     row.Color,
		}
	}
	return out, nil
}

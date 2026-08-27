// 本文件缓存集群节点巡检结果，避免列表与 KPI 对同一集群重复 ListNodes。

package cluster

import (
	"context"
	"time"

	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
)

const inspectTTL = time.Second

type inspectEntry struct {
	nodes     []kube.NodeSnapshot // 节点快照副本
	err       error               // 最近一次实时读取错误
	expiresAt time.Time           // 过期时间
}

func (s *serviceImpl) listNodesQuiet(ctx context.Context, row *entity.OpsCluster) ([]kube.NodeSnapshot, error) {
	now := time.Now()
	s.mu.Lock()
	if entry, ok := s.inspect[row.Id]; ok && now.Before(entry.expiresAt) {
		s.mu.Unlock()
		if entry.err != nil {
			return nil, entry.err
		}
		return cloneNodeSnapshots(entry.nodes), nil
	}
	s.mu.Unlock()

	snaps, err := s.fetchNodeSnapshots(ctx, row)
	s.mu.Lock()
	s.inspect[row.Id] = inspectEntry{
		nodes:     cloneNodeSnapshots(snaps),
		err:       err,
		expiresAt: time.Now().Add(inspectTTL),
	}
	s.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return cloneNodeSnapshots(snaps), nil
}

func (s *serviceImpl) fetchNodeSnapshots(ctx context.Context, row *entity.OpsCluster) ([]kube.NodeSnapshot, error) {
	client, err := s.clientForRow(ctx, row)
	if err != nil {
		return nil, err
	}
	return client.ListNodes(ctx)
}

// dropInspect 丢弃巡检缓存。调用方必须已持有 s.mu。
func (s *serviceImpl) dropInspect(id int64) {
	delete(s.inspect, id)
}

func cloneNodeSnapshots(in []kube.NodeSnapshot) []kube.NodeSnapshot {
	if len(in) == 0 {
		return nil
	}
	out := make([]kube.NodeSnapshot, len(in))
	for i, snap := range in {
		out[i] = snap
		if snap.Labels != nil {
			out[i].Labels = make(map[string]string, len(snap.Labels))
			for key, value := range snap.Labels {
				out[i].Labels[key] = value
			}
		}
		if snap.Taints != nil {
			taints := make([]kube.Taint, len(snap.Taints))
			copy(taints, snap.Taints)
			out[i].Taints = taints
		}
		if snap.Roles != nil {
			roles := make([]string, len(snap.Roles))
			copy(roles, snap.Roles)
			out[i].Roles = roles
		}
		if snap.Conditions != nil {
			conds := make([]string, len(snap.Conditions))
			copy(conds, snap.Conditions)
			out[i].Conditions = conds
		}
	}
	return out
}

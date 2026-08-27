// 本文件把节点与队列计数装配为数据中心关联用量。

package datacenter

import (
	"context"
	"sync"
)

// NodeUsageSource 按数据中心统计节点与覆盖集群。
type NodeUsageSource interface {
	CountNodesByDatacenter(ctx context.Context, codes []string) (nodes map[string]int, clusters map[string]int, err error)
}

// QueueUsageSource 按数据中心统计队列数。
type QueueUsageSource interface {
	CountQueuesByDatacenter(ctx context.Context, codes []string) (map[string]int, error)
}

type liveUsage struct {
	nodes  NodeUsageSource  // 节点来源
	queues QueueUsageSource // 队列来源
}

// NewLiveUsage 用节点与队列来源构造真实关联计数。
func NewLiveUsage(nodes NodeUsageSource, queues QueueUsageSource) UsageCounter {
	return liveUsage{nodes: nodes, queues: queues}
}

// CountByCodes 批量装配关联计数。
func (u liveUsage) CountByCodes(ctx context.Context, codes []string) (map[string]UsageStats, error) {
	out := make(map[string]UsageStats, len(codes))
	for _, code := range codes {
		out[code] = UsageStats{}
	}
	if len(codes) == 0 {
		return out, nil
	}
	if u.nodes != nil {
		nodes, clusters, err := u.nodes.CountNodesByDatacenter(ctx, codes)
		if err != nil {
			return nil, err
		}
		for _, code := range codes {
			stat := out[code]
			stat.Nodes = nodes[code]
			stat.Clusters = clusters[code]
			out[code] = stat
		}
	}
	if u.queues != nil {
		queues, err := u.queues.CountQueuesByDatacenter(ctx, codes)
		if err != nil {
			return nil, err
		}
		for _, code := range codes {
			stat := out[code]
			stat.Queues = queues[code]
			out[code] = stat
		}
	}
	return out, nil
}

// SwitchableUsage 允许在队列服务构造后再替换真实计数器。
type SwitchableUsage struct {
	mu    sync.RWMutex
	inner UsageCounter
}

// NewSwitchableUsage 以零值计数器启动。
func NewSwitchableUsage() *SwitchableUsage {
	return &SwitchableUsage{inner: NewZeroUsageCounter()}
}

// Replace 替换内部计数器。
func (s *SwitchableUsage) Replace(inner UsageCounter) {
	if inner == nil {
		return
	}
	s.mu.Lock()
	s.inner = inner
	s.mu.Unlock()
}

// CountByCodes 转调当前计数器。
func (s *SwitchableUsage) CountByCodes(ctx context.Context, codes []string) (map[string]UsageStats, error) {
	s.mu.RLock()
	inner := s.inner
	s.mu.RUnlock()
	return inner.CountByCodes(ctx, codes)
}

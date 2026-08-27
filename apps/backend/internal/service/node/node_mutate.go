// 本文件实现数据中心分配、标签污点与隔离入池。

package node

import (
	"context"
	"fmt"
	"strings"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// AssignDatacenter 设置或清除 maip.io/datacenter。
func (s *serviceImpl) AssignDatacenter(ctx context.Context, in MutateInput) error {
	names, err := normalizeNames(in.Names)
	if err != nil {
		return err
	}
	code := strings.TrimSpace(in.Code)
	if code != "" {
		if _, err := s.dcSvc.GetByCode(ctx, code); err != nil {
			return err
		}
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return err
	}
	remark := strings.TrimSpace(in.Remark)
	if remark == "" {
		if code == "" {
			remark = "清除数据中心标签"
		} else {
			remark = fmt.Sprintf("数据中心 → %s", code)
		}
	}
	return s.patchEach(ctx, client, in.ClusterID, names, in.Operator, ActionSetDC, remark, kube.NodePatch{
		Labels: map[string]string{consts.LabelKeyDatacenter: code},
	})
}

// UpdateLabels 合并写入标签。
func (s *serviceImpl) UpdateLabels(ctx context.Context, in MutateInput) error {
	names, err := normalizeNames(in.Names)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return err
	}
	return s.patchEach(ctx, client, in.ClusterID, names, in.Operator, ActionLabels, strings.TrimSpace(in.Remark), kube.NodePatch{
		Labels: in.Labels,
	})
}

// UpdateTaints 完整替换污点。
func (s *serviceImpl) UpdateTaints(ctx context.Context, in MutateInput) error {
	names, err := normalizeNames(in.Names)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return err
	}
	taints := in.Taints
	if taints == nil {
		taints = []kube.Taint{}
	}
	return s.patchEach(ctx, client, in.ClusterID, names, in.Operator, ActionTaints, strings.TrimSpace(in.Remark), kube.NodePatch{
		Taints: &taints,
	})
}

// Isolate 执行 cordon 并添加故障污点。
func (s *serviceImpl) Isolate(ctx context.Context, in MutateInput) error {
	names, err := normalizeNames(in.Names)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return err
	}
	unsched := true
	taints, err := s.taintsWithFault(ctx, client, names, true)
	if err != nil {
		return err
	}
	for _, name := range names {
		patch := kube.NodePatch{
			Labels:        map[string]string{consts.LabelKeyFault: "true"},
			Unschedulable: &unsched,
			Taints:        taints[name],
		}
		if err := s.patchEach(ctx, client, in.ClusterID, []string{name}, in.Operator, ActionIsolate, strings.TrimSpace(in.Remark), patch); err != nil {
			return err
		}
	}
	return nil
}

// Recover 执行 uncordon 并移除故障污点。
func (s *serviceImpl) Recover(ctx context.Context, in MutateInput) error {
	names, err := normalizeNames(in.Names)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return err
	}
	unsched := false
	taints, err := s.taintsWithFault(ctx, client, names, false)
	if err != nil {
		return err
	}
	for _, name := range names {
		patch := kube.NodePatch{
			Labels:        map[string]string{consts.LabelKeyFault: ""},
			Unschedulable: &unsched,
			Taints:        taints[name],
		}
		if err := s.patchEach(ctx, client, in.ClusterID, []string{name}, in.Operator, ActionRecover, strings.TrimSpace(in.Remark), patch); err != nil {
			return err
		}
	}
	return nil
}

func (s *serviceImpl) taintsWithFault(ctx context.Context, client kube.ClusterClient, names []string, add bool) (map[string]*[]kube.Taint, error) {
	snaps, err := client.ListNodes(ctx)
	if err != nil {
		return nil, err
	}
	byName := map[string]kube.NodeSnapshot{}
	for _, snap := range snaps {
		byName[snap.Name] = snap
	}
	out := make(map[string]*[]kube.Taint, len(names))
	for _, name := range names {
		snap, ok := byName[name]
		if !ok {
			return nil, bizerr.New(CodeNotFound)
		}
		next := make([]kube.Taint, 0, len(snap.Taints)+1)
		for _, t := range snap.Taints {
			if t.Key == consts.TaintKeyFault {
				continue
			}
			next = append(next, t)
		}
		if add {
			next = append(next, kube.Taint{Key: consts.TaintKeyFault, Value: "true", Effect: "NoSchedule"})
		}
		cp := next
		out[name] = &cp
	}
	return out, nil
}

func (s *serviceImpl) patchEach(ctx context.Context, client kube.ClusterClient, clusterID int64, names []string, operator string, action Action, remark string, patch kube.NodePatch) error {
	if err := ensureNodesExist(ctx, client, names); err != nil {
		return err
	}
	for _, name := range names {
		err := client.PatchNode(ctx, name, patch)
		result := ResultSuccess
		if err != nil {
			result = ResultFail
			if recErr := s.record(ctx, clusterID, name, action, operator, remark, result); recErr != nil {
				logger.Warningf(ctx, "write node event: %v", recErr)
			}
			if bizerr.Is(err, kube.CodeNodeNotFound) {
				return bizerr.New(CodeNotFound)
			}
			return err
		}
		if recErr := s.record(ctx, clusterID, name, action, operator, remark, result); recErr != nil {
			return recErr
		}
	}
	return nil
}

func ensureNodesExist(ctx context.Context, client kube.ClusterClient, names []string) error {
	snaps, err := client.ListNodes(ctx)
	if err != nil {
		return err
	}
	have := map[string]struct{}{}
	for _, snap := range snaps {
		have[snap.Name] = struct{}{}
	}
	for _, name := range names {
		if _, ok := have[name]; !ok {
			return bizerr.New(CodeNotFound)
		}
	}
	return nil
}

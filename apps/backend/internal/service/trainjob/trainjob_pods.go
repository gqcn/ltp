// 本文件实现 Pod 列表、容器日志、关联告警与按节点反查任务。

package trainjob

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/logger"
)

// ListPods 列出 Job 下属 Pod 并回写节点快照。
func (s *serviceImpl) ListPods(ctx context.Context, actor Actor, id int64) ([]Pod, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return nil, err
	}
	snaps, err := client.ListJobPods(ctx, consts.TrainingNamespace, row.Name)
	if err != nil {
		return nil, err
	}
	out := make([]Pod, 0, len(snaps))
	nodes := make([]string, 0, len(snaps))
	seen := map[string]struct{}{}
	for _, p := range snaps {
		out = append(out, Pod{
			Name:     p.Name,
			Task:     p.Task,
			Index:    p.Index,
			Node:     p.Node,
			Phase:    p.Phase,
			Restarts: p.Restarts,
			Role:     p.Role,
		})
		if p.Node == "" {
			continue
		}
		if _, ok := seen[p.Node]; ok {
			continue
		}
		seen[p.Node] = struct{}{}
		nodes = append(nodes, p.Node)
	}
	if _, err := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{Id: id}).Data(do.TrainJob{
		PodNodes: strings.Join(nodes, ","),
	}).Update(); err != nil {
		logger.Warningf(ctx, "update job pod nodes %d: %v", id, err)
	}
	return out, nil
}

// PodLogs 读取训练容器日志。
func (s *serviceImpl) PodLogs(ctx context.Context, actor Actor, id int64, pod string, tail int64) (string, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return "", err
	}
	pod = strings.TrimSpace(pod)
	if pod == "" {
		return "", errInvalid("请选择 Pod")
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return "", err
	}
	return client.GetPodLogs(ctx, consts.TrainingNamespace, pod, tail)
}

// ListAlerts 按节点求交返回告警。
func (s *serviceImpl) ListAlerts(ctx context.Context, actor Actor, id int64) ([]RelatedAlert, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	nodes := splitNodes(row.PodNodes)
	if len(nodes) == 0 {
		if pods, perr := s.ListPods(ctx, actor, id); perr == nil {
			for _, p := range pods {
				if p.Node != "" {
					nodes = append(nodes, p.Node)
				}
			}
		}
	}
	alerts, err := s.alertSvc.ListByClusterNodes(ctx, row.ClusterId, nodes)
	if err != nil {
		return nil, err
	}
	out := make([]RelatedAlert, 0, len(alerts))
	for _, a := range alerts {
		if a == nil {
			continue
		}
		out = append(out, RelatedAlert{
			ID:        a.ID,
			DisplayID: a.DisplayID,
			Severity:  string(a.Severity),
			Title:     a.Title,
			Status:    string(a.Status),
			NodeNames: a.NodeNames,
			CreatedAt: a.CreatedAt,
		})
	}
	return out, nil
}

// ListRelatedJobs 按节点名查找任务。
func (s *serviceImpl) ListRelatedJobs(ctx context.Context, clusterID int64, nodes []string) ([]RelatedJob, error) {
	cleaned := uniqueNodeList(nodes)
	if clusterID <= 0 || len(cleaned) == 0 {
		return []RelatedJob{}, nil
	}
	mod := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{ClusterId: clusterID})
	builder := mod.Builder()
	for i, node := range cleaned {
		pattern := "%" + node + "%"
		if i == 0 {
			builder = builder.WhereLike(dao.TrainJob.Columns().PodNodes, pattern)
			continue
		}
		builder = builder.WhereOrLike(dao.TrainJob.Columns().PodNodes, pattern)
	}
	var rows []*entity.TrainJob
	if err := mod.Where(builder).OrderDesc(dao.TrainJob.Columns().Id).Limit(20).Scan(&rows); err != nil {
		return nil, gerror.Wrap(err, "list jobs by nodes")
	}
	out := make([]RelatedJob, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		out = append(out, RelatedJob{ID: row.Id, Name: row.Name, Status: row.Status})
	}
	return out, nil
}

func splitNodes(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if n := strings.TrimSpace(p); n != "" {
			out = append(out, n)
		}
	}
	return out
}

func uniqueNodeList(nodes []string) []string {
	out := make([]string, 0, len(nodes))
	seen := map[string]struct{}{}
	for _, raw := range nodes {
		n := strings.TrimSpace(raw)
		if n == "" {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		out = append(out, n)
	}
	return out
}

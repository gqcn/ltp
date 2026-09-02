// 本文件按集群对账读盘 Job 与看板 Pod。

package exprun

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/cluster"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/trainjob"
	"github.com/gqcn/ltp/pkg/logger"
)

type metricsJSON struct {
	OK           bool     `json:"ok"`
	Step         *int64   `json:"step"`
	Loss         *float64 `json:"loss"`
	TokensPerSec *float64 `json:"tokensPerSec"`
	MaxSteps     *int64   `json:"maxSteps"`
	Error        string   `json:"error"`
}

// Reconcile 扫描健康集群并对账实验代理。
func (s *serviceImpl) Reconcile(ctx context.Context) error {
	listed, err := s.clusterSvc.List(ctx, cluster.ListInput{PageNum: 1, PageSize: maxListSize})
	if err != nil {
		return err
	}
	for _, item := range listed.List {
		if item == nil || item.Status != cluster.StatusHealthy {
			continue
		}
		if err := s.reconcileCluster(ctx, item.ID); err != nil {
			logger.Warningf(ctx, "reconcile experiments cluster %d: %v", item.ID, err)
		}
	}
	return nil
}

func (s *serviceImpl) reconcileCluster(ctx context.Context, clusterID int64) error {
	client, err := s.clusterSvc.Client(ctx, clusterID)
	if err != nil {
		return err
	}
	jobs, err := client.ListAgentJobs(ctx, consts.TrainingNamespace, agentSelector(agentRoleMetrics))
	if err != nil {
		return err
	}
	pods, err := client.ListAgentPods(ctx, consts.TrainingNamespace, agentSelector(agentRoleServe))
	if err != nil {
		return err
	}
	jobByRun := indexByRun(jobs)
	podByRun := indexByRun(pods)

	var rows []*entity.ExpRun
	if err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{ClusterId: clusterID}).Scan(&rows); err != nil {
		return err
	}
	jobsMap, err := s.jobStatusForRuns(ctx, rows)
	if err != nil {
		return err
	}
	now := time.Now()
	for _, row := range rows {
		if row == nil {
			continue
		}
		job := jobsMap[row.JobId]
		if s.needMetrics(row, job, now) {
			if cur, ok := jobByRun[row.Id]; ok {
				s.finishMetrics(ctx, client, row, cur)
			} else {
				if err := s.startMetrics(ctx, client, row, job); err != nil {
					logger.Warningf(ctx, "start metrics run %d: %v", row.Id, err)
					s.writeMetricsError(ctx, row.Id, "读盘任务启动失败")
				}
			}
		}
		accessed := row.BoardAccessedAt != nil && !row.BoardAccessedAt.IsZero() && now.Sub(row.BoardAccessedAt.Time) <= s.cfg.IdleAfter
		if accessed {
			if _, ok := podByRun[row.Id]; !ok {
				if err := s.ensureServe(ctx, row); err != nil {
					logger.Warningf(ctx, "ensure serve run %d: %v", row.Id, err)
				}
			}
			continue
		}
		if _, ok := podByRun[row.Id]; ok {
			_ = client.DeleteAgentPod(ctx, consts.TrainingNamespace, serveName(row.Id))
			_ = client.DeleteAgentService(ctx, consts.TrainingNamespace, serveName(row.Id))
		}
	}
	return nil
}

func (s *serviceImpl) needMetrics(row *entity.ExpRun, job *trainjob.Item, now time.Time) bool {
	if row.TbLogdir == "" {
		return false
	}
	fresh := row.MetricsAt != nil && !row.MetricsAt.IsZero() && now.Sub(row.MetricsAt.Time) < metricsFreshFor
	if fresh {
		return false
	}
	if job == nil {
		return row.MetricsAt == nil || row.MetricsAt.IsZero()
	}
	switch linkedJobStatus(job.Status) {
	case linkedRunning, linkedStarting:
		return true
	case linkedSuccess, linkedFailed, linkedCancelled:
		if row.MetricsAt == nil || row.MetricsAt.IsZero() {
			return true
		}
		return job.EndedAt > 0 && row.MetricsAt.TimestampMilli() < job.EndedAt
	default:
		return false
	}
}

// startMetrics 创建读盘 Job，节点选择器带机房与可选卡型号。
func (s *serviceImpl) startMetrics(ctx context.Context, client kube.ClusterClient, row *entity.ExpRun, job *trainjob.Item) error {
	if err := client.EnsureNamespace(ctx, consts.TrainingNamespace); err != nil {
		return err
	}
	return client.ApplyAgentJob(ctx, kube.AgentSpec{
		Namespace:  consts.TrainingNamespace,
		Name:       metricsName(row.Id),
		RunID:      row.Id,
		Role:       agentRoleMetrics,
		Datacenter: row.DatacenterCode,
		GPUType:    gpuTypeOf(job),
		Image:      s.cfg.AgentImage,
		Args:       []string{"metrics", "--logdir", row.TbLogdir},
		Env:        map[string]string{consts.EnvTensorBoardLogDir: row.TbLogdir},
	})
}

// finishMetrics 在读盘 Job 结束后解析标准输出并回写快照。
func (s *serviceImpl) finishMetrics(ctx context.Context, client kube.ClusterClient, row *entity.ExpRun, job kube.AgentWorkload) {
	switch job.Phase {
	case "Active":
		return
	case "Succeeded":
		logs, err := readMetricsLogs(ctx, client, row.Id)
		if err != nil {
			s.writeMetricsError(ctx, row.Id, "读取实验指标失败")
			_ = client.DeleteAgentJob(ctx, consts.TrainingNamespace, metricsName(row.Id))
			return
		}
		s.applyMetricsJSON(ctx, row.Id, logs)
		_ = client.DeleteAgentJob(ctx, consts.TrainingNamespace, metricsName(row.Id))
	case "Failed":
		s.writeMetricsError(ctx, row.Id, "读盘任务失败")
		_ = client.DeleteAgentJob(ctx, consts.TrainingNamespace, metricsName(row.Id))
	}
}

// readMetricsLogs 读取该 Run 读盘 Job 下属 Pod 的标准输出。
func readMetricsLogs(ctx context.Context, client kube.ClusterClient, runID int64) (string, error) {
	selector := fmt.Sprintf("%s=%s,%s=%d", consts.LabelKeyAgentRole, agentRoleMetrics, consts.LabelKeyRunID, runID)
	pods, err := client.ListAgentPods(ctx, consts.TrainingNamespace, selector)
	if err != nil {
		return "", err
	}
	if len(pods) == 0 {
		return "", gerror.New("metrics pod not found")
	}
	return client.GetPodLogs(ctx, consts.TrainingNamespace, pods[0].Name, 50)
}

// parseMetricsLine 从日志中解析最后一行指标 JSON。失败时返回中文原因。
func parseMetricsLine(raw string) (*metricsJSON, string) {
	line := lastJSONLine(raw)
	if line == "" {
		return nil, "未读到指标"
	}
	var payload metricsJSON
	if err := json.Unmarshal([]byte(line), &payload); err != nil {
		return nil, "指标格式无效"
	}
	if !payload.OK {
		msg := strings.TrimSpace(payload.Error)
		if msg == "" {
			msg = "未读到指标"
		}
		return nil, msg
	}
	return &payload, ""
}

// applyMetricsJSON 把读盘 JSON 写入 Run 快照；解析失败只记 metrics_error。
func (s *serviceImpl) applyMetricsJSON(ctx context.Context, runID int64, raw string) {
	payload, msg := parseMetricsLine(raw)
	if payload == nil {
		s.writeMetricsError(ctx, runID, msg)
		return
	}
	data := do.ExpRun{MetricsAt: gtime.Now(), MetricsError: ""}
	if payload.Loss != nil {
		data.LastLoss = *payload.Loss
	}
	if payload.Step != nil {
		data.LastStep = *payload.Step
	}
	if payload.TokensPerSec != nil {
		data.LastTokensPerSec = *payload.TokensPerSec
	}
	if payload.MaxSteps != nil && *payload.MaxSteps > 0 {
		data.MaxSteps = *payload.MaxSteps
	}
	if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: runID}).Data(data).Update(); err != nil {
		logger.Warningf(ctx, "update metrics run %d: %v", runID, err)
	}
}

// gpuTypeOf 返回关联任务的卡型号，供读盘与看板与训练任务落在同一类节点。
func gpuTypeOf(job *trainjob.Item) string {
	if job == nil {
		return ""
	}
	return job.GPUType
}

func (s *serviceImpl) writeMetricsError(ctx context.Context, runID int64, message string) {
	if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: runID}).Data(do.ExpRun{MetricsError: message}).Update(); err != nil {
		logger.Warningf(ctx, "write metrics error run %d: %v", runID, err)
	}
}

func (s *serviceImpl) jobStatusForRuns(ctx context.Context, rows []*entity.ExpRun) (map[int64]*trainjob.Item, error) {
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		if row != nil && row.JobId > 0 {
			ids = append(ids, row.JobId)
		}
	}
	if len(ids) == 0 {
		return map[int64]*trainjob.Item{}, nil
	}
	return s.jobSvc.MapByIDs(ctx, ids)
}

func indexByRun(items []kube.AgentWorkload) map[int64]kube.AgentWorkload {
	out := map[int64]kube.AgentWorkload{}
	for _, item := range items {
		raw := item.Labels[consts.LabelKeyRunID]
		var id int64
		if _, err := fmt.Sscanf(raw, "%d", &id); err == nil && id > 0 {
			out[id] = item
		}
	}
	return out
}

func lastJSONLine(raw string) string {
	lines := strings.Split(raw, "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "{") {
			return line
		}
	}
	return ""
}

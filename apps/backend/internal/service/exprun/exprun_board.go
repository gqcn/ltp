// 本文件实现 TensorBoard 看板打开与会话反代。

package exprun

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/internal/service/trainjob"
	"github.com/gqcn/ltp/pkg/logger"
)

// OpenBoard 记录访问并确保 serve Pod 就绪。
func (s *serviceImpl) OpenBoard(ctx context.Context, actor Actor, id int64) (*BoardOpen, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: id}).Data(do.ExpRun{BoardAccessedAt: gtime.Now()}).Update(); err != nil {
		return nil, gerror.Wrap(err, "touch board access")
	}
	if err := s.ensureServe(ctx, row); err != nil {
		logger.Warningf(ctx, "ensure serve for run %d: %v", id, err)
	}
	deadline := time.Now().Add(boardWait)
	for time.Now().Before(deadline) {
		ready, err := s.serveReady(ctx, row)
		if err != nil {
			return &BoardOpen{ProxyPath: boardProxyPath(id), Ready: false, Message: "看板启动失败"}, nil
		}
		if ready {
			status, body, _, probeErr := s.ProxyBoard(ctx, actor, id, http.MethodGet, "", "", nil, nil)
			if probeErr == nil && status >= 200 && status < 400 && bytes.Contains(bytes.ToLower(body), []byte("html")) {
				return &BoardOpen{ProxyPath: boardProxyPath(id), Ready: true}, nil
			}
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return &BoardOpen{ProxyPath: boardProxyPath(id), Ready: false, Message: "TensorBoard 尚未就绪"}, nil
}

// ProxyBoard 将会话请求反代到 serve Pod。
func (s *serviceImpl) ProxyBoard(ctx context.Context, actor Actor, id int64, method, path, rawQuery string, header map[string]string, body []byte) (int, []byte, map[string]string, error) {
	row, err := s.mustVisible(ctx, actor, id)
	if err != nil {
		return 0, nil, nil, err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return 0, nil, nil, err
	}
	res, err := client.ProxyPod(ctx, kube.PodProxyInput{
		Namespace: consts.TrainingNamespace,
		Pod:       serveName(row.Id),
		Port:      consts.ExperimentAgentPort,
		Method:    method,
		Path:      strings.TrimPrefix(path, "/"),
		RawQuery:  rawQuery,
		Header:    header,
		Body:      body,
	})
	if err != nil {
		return 0, nil, nil, err
	}
	return res.Status, res.Body, res.Header, nil
}

func (s *serviceImpl) ensureServe(ctx context.Context, row *entity.ExpRun) error {
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	if err := client.EnsureNamespace(ctx, consts.TrainingNamespace); err != nil {
		return err
	}
	labels := map[string]string{
		consts.LabelKeyManaged:   "true",
		consts.LabelKeyAgent:     consts.AgentLabelValue,
		consts.LabelKeyAgentRole: agentRoleServe,
		consts.LabelKeyRunID:     fmt.Sprintf("%d", row.Id),
	}
	spec := kube.AgentSpec{
		Namespace:  consts.TrainingNamespace,
		Name:       serveName(row.Id),
		RunID:      row.Id,
		Role:       agentRoleServe,
		Datacenter: row.DatacenterCode,
		GPUType:    gpuTypeOf(s.linkedJob(ctx, row.JobId)),
		Image:      s.cfg.AgentImage,
		Args: []string{
			"serve",
			"--logdir", row.TbLogdir,
			"--port", fmt.Sprintf("%d", consts.ExperimentAgentPort),
		},
		Env: map[string]string{consts.EnvTensorBoardLogDir: row.TbLogdir},
	}
	if err := client.ApplyAgentPod(ctx, spec); err != nil {
		return err
	}
	return client.ApplyAgentService(ctx, consts.TrainingNamespace, serveName(row.Id), labels, consts.ExperimentAgentPort)
}

func (s *serviceImpl) serveReady(ctx context.Context, row *entity.ExpRun) (bool, error) {
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return false, err
	}
	selector := fmt.Sprintf("%s=%s,%s=%d", consts.LabelKeyAgentRole, agentRoleServe, consts.LabelKeyRunID, row.Id)
	pods, err := client.ListAgentPods(ctx, consts.TrainingNamespace, selector)
	if err != nil {
		return false, err
	}
	for _, pod := range pods {
		if pod.Ready {
			return true, nil
		}
	}
	return false, nil
}

// linkedJob 按任务 ID 取投影；缺失或查询失败时返回 nil。
func (s *serviceImpl) linkedJob(ctx context.Context, jobID int64) *trainjob.Item {
	if jobID <= 0 || s.jobSvc == nil {
		return nil
	}
	jobs, err := s.jobSvc.MapByIDs(ctx, []int64{jobID})
	if err != nil || jobs == nil {
		return nil
	}
	return jobs[jobID]
}

func serveName(runID int64) string {
	return fmt.Sprintf("exp-%d-tb", runID)
}

func metricsName(runID int64) string {
	return fmt.Sprintf("exp-%d-metrics", runID)
}

func boardProxyPath(runID int64) string {
	return fmt.Sprintf("/api/training/experiments/%d/board/", runID)
}

func agentSelector(role string) string {
	return fmt.Sprintf("%s=%s,%s=%s", consts.LabelKeyAgent, consts.AgentLabelValue, consts.LabelKeyAgentRole, role)
}

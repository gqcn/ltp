// 本文件实现读取训练任务 Pod 日志。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// GetJobLogs 读取容器日志。
func (c *ControllerV1) GetJobLogs(ctx context.Context, req *v1.GetJobLogsReq) (*v1.GetJobLogsRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	content, err := c.jobSvc.PodLogs(ctx, actor, req.Id, req.Pod, req.TailLines)
	if err != nil {
		return nil, err
	}
	return &v1.GetJobLogsRes{Content: content}, nil
}

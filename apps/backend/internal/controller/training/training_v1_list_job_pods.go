// 本文件实现训练任务 Pod 列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// ListJobPods 列出 Pod。
func (c *ControllerV1) ListJobPods(ctx context.Context, req *v1.ListJobPodsReq) (*v1.ListJobPodsRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	pods, err := c.jobSvc.ListPods(ctx, actor, req.Id)
	if err != nil {
		return nil, err
	}
	list := make([]*v1.JobPod, 0, len(pods))
	for _, p := range pods {
		list = append(list, &v1.JobPod{
			Name:     p.Name,
			Task:     p.Task,
			Index:    p.Index,
			Node:     p.Node,
			Phase:    p.Phase,
			Restarts: p.Restarts,
			Role:     p.Role,
		})
	}
	return &v1.ListJobPodsRes{List: list}, nil
}

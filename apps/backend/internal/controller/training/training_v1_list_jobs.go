// 本文件实现训练任务列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/trainjob"
)

// ListJobs 返回分页任务。
func (c *ControllerV1) ListJobs(ctx context.Context, req *v1.ListJobsReq) (*v1.ListJobsRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.jobSvc.List(ctx, trainjob.ListInput{
		Actor:     actor,
		ClusterID: req.ClusterId,
		PageNum:   req.PageNum,
		PageSize:  req.PageSize,
		Keyword:   req.Keyword,
		TeamID:    req.TeamId,
		QueueID:   req.QueueId,
		Status:    req.Status,
		Priority:  req.Priority,
		Node:      req.Node,
	})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.JobListItem, 0, len(out.List))
	for _, item := range out.List {
		list = append(list, toJobListItem(item))
	}
	return &v1.ListJobsRes{List: list, Total: out.Total}, nil
}

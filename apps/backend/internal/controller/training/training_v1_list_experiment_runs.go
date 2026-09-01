// 本文件实现实验 Run 列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/exprun"
)

// ListExperimentRuns 返回分页 Run。
func (c *ControllerV1) ListExperimentRuns(ctx context.Context, req *v1.ListExperimentRunsReq) (*v1.ListExperimentRunsRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.runSvc.List(ctx, exprun.ListInput{
		Actor:     runActor,
		ClusterID: req.ClusterId,
		PageNum:   req.PageNum,
		PageSize:  req.PageSize,
		ProjectID: req.ProjectId,
		Keyword:   req.Keyword,
		Status:    req.Status,
		Owner:     req.Owner,
		Sort:      req.Sort,
	})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.ExperimentRunListItem, 0, len(out.List))
	for _, item := range out.List {
		list = append(list, toExperimentRunListItem(item))
	}
	return &v1.ListExperimentRunsRes{List: list, Total: out.Total}, nil
}

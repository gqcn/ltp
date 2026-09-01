// 本文件实现实验项目列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/expproject"
)

// ListExperimentProjects 返回项目列表。
func (c *ControllerV1) ListExperimentProjects(ctx context.Context, req *v1.ListExperimentProjectsReq) (*v1.ListExperimentProjectsRes, error) {
	projActor, _, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.projectSvc.List(ctx, expproject.ListInput{Actor: projActor, ClusterID: req.ClusterId})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.ExperimentProject, 0, len(out))
	for _, item := range out {
		list = append(list, toExperimentProject(item))
	}
	return &v1.ListExperimentProjectsRes{List: list}, nil
}

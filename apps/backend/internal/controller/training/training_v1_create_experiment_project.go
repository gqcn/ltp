// 本文件实现创建实验项目。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// CreateExperimentProject 创建项目。
func (c *ControllerV1) CreateExperimentProject(ctx context.Context, req *v1.CreateExperimentProjectReq) (*v1.CreateExperimentProjectRes, error) {
	projActor, _, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	id, err := c.projectSvc.Create(ctx, projActor, req.Name, req.Description)
	if err != nil {
		return nil, err
	}
	return &v1.CreateExperimentProjectRes{Id: id}, nil
}

// 本文件实现更新实验项目名称与描述。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// UpdateExperimentProject 更新名称与描述。
func (c *ControllerV1) UpdateExperimentProject(ctx context.Context, req *v1.UpdateExperimentProjectReq) (*v1.UpdateExperimentProjectRes, error) {
	projActor, _, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.projectSvc.Update(ctx, projActor, req.Id, req.Name, req.Description); err != nil {
		return nil, err
	}
	return &v1.UpdateExperimentProjectRes{}, nil
}

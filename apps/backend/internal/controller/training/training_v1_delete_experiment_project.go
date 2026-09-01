// 本文件实现删除实验项目。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// DeleteExperimentProject 软删除非默认项目。
func (c *ControllerV1) DeleteExperimentProject(ctx context.Context, req *v1.DeleteExperimentProjectReq) (*v1.DeleteExperimentProjectRes, error) {
	projActor, _, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.projectSvc.Delete(ctx, projActor, req.Id); err != nil {
		return nil, err
	}
	return &v1.DeleteExperimentProjectRes{}, nil
}

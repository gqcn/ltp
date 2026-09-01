// 本文件实现移动实验 Run 所属项目。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// UpdateExperimentRun 把 Run 移动到目标项目。
func (c *ControllerV1) UpdateExperimentRun(ctx context.Context, req *v1.UpdateExperimentRunReq) (*v1.UpdateExperimentRunRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.runSvc.Move(ctx, runActor, req.Id, req.ProjectId); err != nil {
		return nil, err
	}
	return &v1.UpdateExperimentRunRes{}, nil
}

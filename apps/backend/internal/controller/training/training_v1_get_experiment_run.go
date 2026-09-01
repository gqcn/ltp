// 本文件实现实验 Run 详情。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// GetExperimentRun 返回 Run 详情。
func (c *ControllerV1) GetExperimentRun(ctx context.Context, req *v1.GetExperimentRunReq) (*v1.GetExperimentRunRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	item, err := c.runSvc.Get(ctx, runActor, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.GetExperimentRunRes{ExperimentRunDetail: *toExperimentRunDetail(item)}, nil
}

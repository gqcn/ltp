// 本文件实现删除实验 Run。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// DeleteExperimentRun 软删除可见 Run。
func (c *ControllerV1) DeleteExperimentRun(ctx context.Context, req *v1.DeleteExperimentRunReq) (*v1.DeleteExperimentRunRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.runSvc.Delete(ctx, runActor, req.Id); err != nil {
		return nil, err
	}
	return &v1.DeleteExperimentRunRes{}, nil
}

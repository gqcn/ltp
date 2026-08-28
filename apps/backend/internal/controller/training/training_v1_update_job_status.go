// 本文件实现停止训练任务。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// UpdateJobStatus 停止任务。
func (c *ControllerV1) UpdateJobStatus(ctx context.Context, req *v1.UpdateJobStatusReq) (*v1.UpdateJobStatusRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.jobSvc.Cancel(ctx, actor, req.Id); err != nil {
		return nil, err
	}
	return &v1.UpdateJobStatusRes{}, nil
}

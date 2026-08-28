// 本文件实现训练任务详情。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// GetJob 返回任务详情。
func (c *ControllerV1) GetJob(ctx context.Context, req *v1.GetJobReq) (*v1.GetJobRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	item, err := c.jobSvc.Get(ctx, actor, req.Id)
	if err != nil {
		return nil, err
	}
	return toJobDetail(item), nil
}

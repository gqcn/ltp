// 本文件处理团队关联队列的全量替换。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
)

// ReplaceQueues 按所选队列全量替换该团队绑定。
func (c *ControllerV1) ReplaceQueues(ctx context.Context, req *v1.ReplaceQueuesReq) (res *v1.ReplaceQueuesRes, err error) {
	if err := c.teamSvc.SetQueues(ctx, req.Id, req.QueueIds); err != nil {
		return nil, err
	}
	return &v1.ReplaceQueuesRes{}, nil
}

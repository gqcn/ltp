// 本文件处理更新团队。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
)

// Update 修改团队名称、描述与负责人。
func (c *ControllerV1) Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error) {
	if err := c.teamSvc.Update(ctx, teamsvc.UpdateInput{
		ID:          req.Id,
		Name:        req.Name,
		Description: req.Description,
		OwnerUserID: req.OwnerUserId,
	}); err != nil {
		return nil, err
	}
	return &v1.UpdateRes{}, nil
}

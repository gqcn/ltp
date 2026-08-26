// 本文件处理创建团队。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
)

// Create 创建虚拟团队。
func (c *ControllerV1) Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error) {
	id, err := c.teamSvc.Create(ctx, teamsvc.CreateInput{
		Name:        req.Name,
		Description: req.Description,
		OwnerUserID: req.OwnerUserId,
	})
	if err != nil {
		return nil, err
	}
	return &v1.CreateRes{Id: id}, nil
}

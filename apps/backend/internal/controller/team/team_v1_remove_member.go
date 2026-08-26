// 本文件处理移除团队成员。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
)

// RemoveMember 解除用户与团队的成员关系。
func (c *ControllerV1) RemoveMember(ctx context.Context, req *v1.RemoveMemberReq) (res *v1.RemoveMemberRes, err error) {
	if err := c.teamSvc.RemoveMember(ctx, req.Id, req.UserId); err != nil {
		return nil, err
	}
	return &v1.RemoveMemberRes{}, nil
}

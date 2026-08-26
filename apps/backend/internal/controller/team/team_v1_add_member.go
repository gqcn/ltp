// 本文件处理添加团队成员。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
)

// AddMember 向团队添加启用中的平台用户。
func (c *ControllerV1) AddMember(ctx context.Context, req *v1.AddMemberReq) (res *v1.AddMemberRes, err error) {
	if err := c.teamSvc.AddMember(ctx, req.Id, req.UserId); err != nil {
		return nil, err
	}
	return &v1.AddMemberRes{}, nil
}

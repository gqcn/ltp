// 本文件处理批量角色授权。

package user

import (
	"context"

	v1 "github.com/gqcn/ltp/api/user/v1"
	"github.com/gqcn/ltp/internal/service/role"
)

// UpdateRole 批量为用户指定角色。
func (c *ControllerV1) UpdateRole(ctx context.Context, req *v1.UpdateRoleReq) (res *v1.UpdateRoleRes, err error) {
	code, _ := role.ParseCode(req.RoleCode)
	updated, err := c.userSvc.UpdateRole(ctx, req.Ids, code)
	if err != nil {
		return nil, err
	}
	return &v1.UpdateRoleRes{Updated: updated}, nil
}

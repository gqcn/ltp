// 本文件处理角色改名。

package role

import (
	"context"

	v1 "github.com/gqcn/ltp/api/role/v1"
)

// Update 修改角色显示名称。
func (c *ControllerV1) Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error) {
	updatedBy := ""
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		updatedBy = ident.Nickname
	}
	if err := c.roleSvc.Rename(ctx, req.Id, req.Name, updatedBy); err != nil {
		return nil, err
	}
	return &v1.UpdateRes{}, nil
}

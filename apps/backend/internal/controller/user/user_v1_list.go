// 本文件实现平台用户列表处理。

package user

import (
	"context"

	v1 "github.com/gqcn/ltp/api/user/v1"
	usersvc "github.com/gqcn/ltp/internal/service/user"
)

// List 返回筛选后的平台用户分页。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.userSvc.List(ctx, usersvc.ListInput{
		PageNum:  req.PageNum,
		PageSize: req.PageSize,
		Keyword:  req.Keyword,
		RoleCode: req.RoleCode,
		Enabled:  req.Enabled,
		TeamID:   req.TeamId,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, toListItem(item))
	}
	return &v1.ListRes{List: items, Total: out.Total}, nil
}

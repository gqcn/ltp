// 本文件实现角色列表处理。

package role

import (
	"context"

	v1 "github.com/gqcn/ltp/api/role/v1"
)

// List 返回内置角色。
func (c *ControllerV1) List(ctx context.Context, _ *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.roleSvc.List(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out))
	for _, item := range out {
		if item == nil {
			continue
		}
		menus := item.Menus
		if menus == nil {
			menus = []string{}
		}
		items = append(items, &v1.ListItem{
			Id:          item.ID,
			Code:        string(item.Code),
			Name:        item.Name,
			Description: item.Description,
			Menus:       menus,
			Builtin:     item.Builtin,
			UserCount:   item.UserCount,
			UpdatedBy:   item.UpdatedBy,
			UpdatedAt:   item.UpdatedAt,
		})
	}
	return &v1.ListRes{List: items}, nil
}

// 本文件实现团队列表处理。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
)

// List 返回筛选后的团队分页。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.teamSvc.List(ctx, teamsvc.ListInput{
		PageNum:  req.PageNum,
		PageSize: req.PageSize,
		Keyword:  req.Keyword,
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

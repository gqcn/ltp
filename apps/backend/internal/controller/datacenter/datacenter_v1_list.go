// 本文件实现数据中心列表处理。

package datacenter

import (
	"context"

	v1 "github.com/gqcn/ltp/api/datacenter/v1"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
)

// List 返回筛选后的数据中心分页。
func (c *ControllerV1) List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error) {
	out, err := c.dcSvc.List(ctx, dcsvc.ListInput{
		PageNum:  req.PageNum,
		PageSize: req.PageSize,
		Keyword:  req.Keyword,
		Enabled:  req.Enabled,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.ListItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, toListItem(item))
	}
	return &v1.ListRes{
		List:  items,
		Total: out.Total,
		Summary: v1.ListSummary{
			Total:            out.Summary.Total,
			Enabled:          out.Summary.Enabled,
			Disabled:         out.Summary.Disabled,
			DefaultShortName: out.Summary.DefaultShortName,
		},
	}, nil
}

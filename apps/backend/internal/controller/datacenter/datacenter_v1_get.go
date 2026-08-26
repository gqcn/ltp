// 本文件实现数据中心详情处理。

package datacenter

import (
	"context"

	v1 "github.com/gqcn/ltp/api/datacenter/v1"
)

// Get 按 ID 返回数据中心。
func (c *ControllerV1) Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error) {
	item, err := c.dcSvc.Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.GetRes{ListItem: *toListItem(item)}, nil
}

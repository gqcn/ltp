// 本文件实现数据中心元数据更新处理。

package datacenter

import (
	"context"

	v1 "github.com/gqcn/ltp/api/datacenter/v1"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
)

// Update 修改数据中心展示元数据。
func (c *ControllerV1) Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error) {
	err = c.dcSvc.Update(ctx, dcsvc.UpdateInput{
		ID:          req.Id,
		Name:        req.Name,
		ShortName:   req.ShortName,
		Region:      req.Region,
		Color:       req.Color,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateRes{}, nil
}

// 本文件实现数据中心创建处理。

package datacenter

import (
	"context"

	v1 "github.com/gqcn/ltp/api/datacenter/v1"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
)

// Create 插入数据中心并返回 ID。
func (c *ControllerV1) Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error) {
	id, err := c.dcSvc.Create(ctx, dcsvc.CreateInput{
		Code:        req.Code,
		Name:        req.Name,
		ShortName:   req.ShortName,
		Region:      req.Region,
		Color:       req.Color,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}
	return &v1.CreateRes{Id: id}, nil
}

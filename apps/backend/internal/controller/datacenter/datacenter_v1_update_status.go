// 本文件实现数据中心启停处理。

package datacenter

import (
	"context"

	v1 "github.com/gqcn/ltp/api/datacenter/v1"
)

// UpdateStatus 启用或停用数据中心。
func (c *ControllerV1) UpdateStatus(ctx context.Context, req *v1.UpdateStatusReq) (res *v1.UpdateStatusRes, err error) {
	if err := c.dcSvc.UpdateStatus(ctx, req.Id, req.Enabled); err != nil {
		return nil, err
	}
	return &v1.UpdateStatusRes{}, nil
}

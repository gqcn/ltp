// 本文件处理批量启用或停用平台用户。

package user

import (
	"context"

	v1 "github.com/gqcn/ltp/api/user/v1"
)

// UpdateStatus 批量更新用户启用状态。
func (c *ControllerV1) UpdateStatus(ctx context.Context, req *v1.UpdateStatusReq) (res *v1.UpdateStatusRes, err error) {
	updated, err := c.userSvc.UpdateStatus(ctx, req.Ids, req.Enabled)
	if err != nil {
		return nil, err
	}
	return &v1.UpdateStatusRes{Updated: updated}, nil
}

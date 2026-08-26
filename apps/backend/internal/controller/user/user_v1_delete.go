// 本文件处理批量移除平台用户。

package user

import (
	"context"

	v1 "github.com/gqcn/ltp/api/user/v1"
)

// Delete 软删除平台用户。
func (c *ControllerV1) Delete(ctx context.Context, req *v1.DeleteReq) (res *v1.DeleteRes, err error) {
	actorID := int64(0)
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		actorID = ident.UserID
	}
	removed, err := c.userSvc.Remove(ctx, req.Ids, actorID)
	if err != nil {
		return nil, err
	}
	return &v1.DeleteRes{Removed: removed}, nil
}

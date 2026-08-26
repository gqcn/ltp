// 本文件处理从 LDAP 添加平台用户。

package user

import (
	"context"

	v1 "github.com/gqcn/ltp/api/user/v1"
	"github.com/gqcn/ltp/internal/service/role"
)

// Create 从 LDAP 批量加入平台用户。
func (c *ControllerV1) Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error) {
	code, ok := role.ParseCode(req.RoleCode)
	if !ok {
		code = ""
	}
	added, err := c.userSvc.AddFromDirectory(ctx, req.Usernames, code)
	if err != nil {
		return nil, err
	}
	return &v1.CreateRes{Added: added}, nil
}

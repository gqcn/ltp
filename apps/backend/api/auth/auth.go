// =================================================================================
// 由 GoFrame CLI 生成并维护，请勿手工修改。
// =================================================================================

package auth

import (
	"context"

	"github.com/gqcn/ltp/api/auth/v1"
)

type IAuthV1 interface {
	Login(ctx context.Context, req *v1.LoginReq) (res *v1.LoginRes, err error)
	Logout(ctx context.Context, req *v1.LogoutReq) (res *v1.LogoutRes, err error)
	Session(ctx context.Context, req *v1.SessionReq) (res *v1.SessionRes, err error)
}

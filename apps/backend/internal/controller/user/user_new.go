// 本文件定义用户控制器构造函数与注入依赖。

package user

import (
	userapi "github.com/gqcn/ltp/api/user"
	"github.com/gqcn/ltp/internal/service/bizctx"
	usersvc "github.com/gqcn/ltp/internal/service/user"
)

// ControllerV1 是用户控制器。
type ControllerV1 struct {
	userSvc   usersvc.Service
	bizCtxSvc bizctx.Service
}

// NewV1 创建用户控制器。
func NewV1(userSvc usersvc.Service, bizCtxSvc bizctx.Service) userapi.IUserV1 {
	return &ControllerV1{userSvc: userSvc, bizCtxSvc: bizCtxSvc}
}

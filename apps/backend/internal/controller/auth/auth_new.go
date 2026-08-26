// 本文件定义认证控制器构造函数与注入依赖。

package auth

import (
	authapi "github.com/gqcn/ltp/api/auth"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
)

// ControllerV1 是认证控制器。
type ControllerV1 struct {
	authSvc    authsvc.Service
	cookieName string
}

// NewV1 创建认证控制器。
func NewV1(authSvc authsvc.Service, cookieName string) authapi.IAuthV1 {
	return &ControllerV1{
		authSvc:    authSvc,
		cookieName: cookieName,
	}
}

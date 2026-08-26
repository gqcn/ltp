// 本文件定义系统配置控制器构造函数与注入依赖。

package system

import (
	systemapi "github.com/gqcn/ltp/api/system"
	"github.com/gqcn/ltp/internal/service/bizctx"
	ldapsvc "github.com/gqcn/ltp/internal/service/ldap"
	usersvc "github.com/gqcn/ltp/internal/service/user"
)

// ControllerV1 是系统配置控制器。
type ControllerV1 struct {
	ldapSvc   ldapsvc.Service
	userSvc   usersvc.Service
	bizCtxSvc bizctx.Service
}

// NewV1 创建系统配置控制器。
func NewV1(ldapSvc ldapsvc.Service, userSvc usersvc.Service, bizCtxSvc bizctx.Service) systemapi.ISystemV1 {
	return &ControllerV1{ldapSvc: ldapSvc, userSvc: userSvc, bizCtxSvc: bizCtxSvc}
}

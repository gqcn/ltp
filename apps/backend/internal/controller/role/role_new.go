// 本文件定义角色控制器构造函数与注入依赖。

package role

import (
	roleapi "github.com/gqcn/ltp/api/role"
	"github.com/gqcn/ltp/internal/service/bizctx"
	rolesvc "github.com/gqcn/ltp/internal/service/role"
)

// ControllerV1 是角色控制器。
type ControllerV1 struct {
	roleSvc   rolesvc.Service
	bizCtxSvc bizctx.Service
}

// NewV1 创建角色控制器。
func NewV1(roleSvc rolesvc.Service, bizCtxSvc bizctx.Service) roleapi.IRoleV1 {
	return &ControllerV1{roleSvc: roleSvc, bizCtxSvc: bizCtxSvc}
}

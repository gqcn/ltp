// 本文件定义节点控制器构造函数与注入依赖。

package node

import (
	"context"

	nodeapi "github.com/gqcn/ltp/api/node"
	"github.com/gqcn/ltp/internal/service/bizctx"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// ControllerV1 是节点控制器。
type ControllerV1 struct {
	nodeSvc   nodesvc.Service
	bizCtxSvc bizctx.Service
}

// NewV1 创建节点控制器。
func NewV1(nodeSvc nodesvc.Service, bizCtxSvc bizctx.Service) nodeapi.INodeV1 {
	return &ControllerV1{nodeSvc: nodeSvc, bizCtxSvc: bizCtxSvc}
}

func (c *ControllerV1) operator(ctx context.Context) string {
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		if ident.Nickname != "" {
			return ident.Nickname
		}
		return ident.Username
	}
	return ""
}

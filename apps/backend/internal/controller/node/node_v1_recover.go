// 本文件实现节点入池处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// Recover 整节点入池。
func (c *ControllerV1) Recover(ctx context.Context, req *v1.RecoverReq) (res *v1.RecoverRes, err error) {
	err = c.nodeSvc.Recover(ctx, nodesvc.MutateInput{
		ClusterID: req.ClusterId,
		Names:     req.Names,
		Operator:  c.operator(ctx),
		Remark:    req.Remark,
	})
	if err != nil {
		return nil, err
	}
	return &v1.RecoverRes{}, nil
}

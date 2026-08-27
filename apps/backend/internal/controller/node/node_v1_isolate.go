// 本文件实现节点隔离处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// Isolate 整节点隔离。
func (c *ControllerV1) Isolate(ctx context.Context, req *v1.IsolateReq) (res *v1.IsolateRes, err error) {
	err = c.nodeSvc.Isolate(ctx, nodesvc.MutateInput{
		ClusterID: req.ClusterId,
		Names:     req.Names,
		Operator:  c.operator(ctx),
		Remark:    req.Remark,
	})
	if err != nil {
		return nil, err
	}
	return &v1.IsolateRes{}, nil
}

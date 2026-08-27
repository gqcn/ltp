// 本文件实现节点数据中心分配处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// AssignDatacenter 设置或清除数据中心标签。
func (c *ControllerV1) AssignDatacenter(ctx context.Context, req *v1.AssignDatacenterReq) (res *v1.AssignDatacenterRes, err error) {
	err = c.nodeSvc.AssignDatacenter(ctx, nodesvc.MutateInput{
		ClusterID: req.ClusterId,
		Names:     req.Names,
		Operator:  c.operator(ctx),
		Remark:    req.Remark,
		Code:      req.Code,
	})
	if err != nil {
		return nil, err
	}
	return &v1.AssignDatacenterRes{}, nil
}

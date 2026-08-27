// 本文件实现节点标签更新处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// UpdateLabels 合并写入标签。
func (c *ControllerV1) UpdateLabels(ctx context.Context, req *v1.UpdateLabelsReq) (res *v1.UpdateLabelsRes, err error) {
	err = c.nodeSvc.UpdateLabels(ctx, nodesvc.MutateInput{
		ClusterID: req.ClusterId,
		Names:     req.Names,
		Operator:  c.operator(ctx),
		Remark:    req.Remark,
		Labels:    req.Labels,
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateLabelsRes{}, nil
}

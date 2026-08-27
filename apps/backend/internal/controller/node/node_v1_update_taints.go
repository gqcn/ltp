// 本文件实现节点污点更新处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	"github.com/gqcn/ltp/internal/service/kube"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// UpdateTaints 替换污点列表。
func (c *ControllerV1) UpdateTaints(ctx context.Context, req *v1.UpdateTaintsReq) (res *v1.UpdateTaintsRes, err error) {
	taints := make([]kube.Taint, 0, len(req.Taints))
	for _, t := range req.Taints {
		taints = append(taints, kube.Taint{Key: t.Key, Value: t.Value, Effect: t.Effect})
	}
	err = c.nodeSvc.UpdateTaints(ctx, nodesvc.MutateInput{
		ClusterID: req.ClusterId,
		Names:     req.Names,
		Operator:  c.operator(ctx),
		Remark:    req.Remark,
		Taints:    taints,
	})
	if err != nil {
		return nil, err
	}
	return &v1.UpdateTaintsRes{}, nil
}

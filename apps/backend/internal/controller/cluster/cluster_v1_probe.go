// 本文件实现集群连通测试处理。

package cluster

import (
	"context"

	v1 "github.com/gqcn/ltp/api/cluster/v1"
)

// Probe 连通测试。
func (c *ControllerV1) Probe(ctx context.Context, req *v1.ProbeReq) (res *v1.ProbeRes, err error) {
	item, err := c.clusterSvc.Probe(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.ProbeRes{
		Status:     string(item.Status),
		Version:    item.Version,
		ApiServer:  item.APIServer,
		LastSyncAt: item.LastSyncAt,
	}, nil
}

// 本文件实现维护记录列表处理。

package node

import (
	"context"

	v1 "github.com/gqcn/ltp/api/node/v1"
	nodesvc "github.com/gqcn/ltp/internal/service/node"
)

// EventList 返回维护记录。
func (c *ControllerV1) EventList(ctx context.Context, req *v1.EventListReq) (res *v1.EventListRes, err error) {
	out, err := c.nodeSvc.ListEvents(ctx, nodesvc.EventListInput{
		ClusterID: req.ClusterId,
		NodeName:  req.NodeName,
		PageNum:   req.PageNum,
		PageSize:  req.PageSize,
	})
	if err != nil {
		return nil, err
	}
	items := make([]*v1.EventItem, 0, len(out.List))
	for _, item := range out.List {
		items = append(items, &v1.EventItem{
			Id:        item.ID,
			ClusterId: item.ClusterID,
			NodeName:  item.NodeName,
			Action:    string(item.Action),
			Operator:  item.Operator,
			Remark:    item.Remark,
			Result:    string(item.Result),
			CreatedAt: item.CreatedAt,
		})
	}
	return &v1.EventListRes{List: items, Total: out.Total}, nil
}

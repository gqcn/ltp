// 本文件处理可绑定队列候选项查询。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
)

// ListQueueOptions 返回「管理队列」弹窗候选项。
func (c *ControllerV1) ListQueueOptions(ctx context.Context, req *v1.ListQueueOptionsReq) (res *v1.ListQueueOptionsRes, err error) {
	list, total, err := c.teamSvc.ListQueueOptions(ctx, req.Keyword, req.PageNum, req.PageSize)
	if err != nil {
		return nil, err
	}
	out := make([]v1.QueueOption, 0, len(list))
	for _, item := range list {
		out = append(out, v1.QueueOption{
			Id:                  item.ID,
			Name:                item.Name,
			DisplayName:         item.DisplayName,
			DatacenterCode:      item.DatacenterCode,
			DatacenterName:      item.DatacenterName,
			DatacenterShortName: item.DatacenterShortName,
			DatacenterColor:     item.DatacenterColor,
			GpuType:             item.GPUType,
			GpuQuota:            item.GPUQuota,
			GpuUsed:             item.GPUUsed,
			Enabled:             item.Enabled,
			State:               item.State,
		})
	}
	return &v1.ListQueueOptionsRes{List: out, Total: total}, nil
}

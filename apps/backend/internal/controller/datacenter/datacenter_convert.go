// 本文件将数据中心服务投影映射为公开 API DTO。

package datacenter

import (
	v1 "github.com/gqcn/ltp/api/datacenter/v1"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
)

func toListItem(item *dcsvc.Item) *v1.ListItem {
	if item == nil {
		return nil
	}
	return &v1.ListItem{
		Id:          item.ID,
		Code:        item.Code,
		Name:        item.Name,
		ShortName:   item.ShortName,
		Region:      item.Region,
		LabelKey:    item.LabelKey,
		Label:       item.Label,
		Color:       item.Color,
		Description: item.Description,
		Enabled:     item.Enabled,
		IsDefault:   item.IsDefault,
		Usage: v1.UsageItem{
			Nodes:    item.Usage.Nodes,
			Queues:   item.Usage.Queues,
			Clusters: item.Usage.Clusters,
		},
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

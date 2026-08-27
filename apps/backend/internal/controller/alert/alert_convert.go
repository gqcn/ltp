// 本文件把告警服务投影转换为 API DTO。

package alert

import (
	v1 "github.com/gqcn/ltp/api/alert/v1"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

func toListItem(item *alertsvc.Item) *v1.ListItem {
	return &v1.ListItem{
		Id:           item.ID,
		DisplayId:    item.DisplayID,
		ClusterId:    item.ClusterID,
		Severity:     string(item.Severity),
		Title:        item.Title,
		AlertInfo:    item.AlertInfo,
		FaultInfo:    item.FaultInfo,
		Source:       item.Source,
		NodeNames:    item.NodeNames,
		Status:       string(item.Status),
		HandleRemark: item.HandleRemark,
		HandledAt:    item.HandledAt,
		HandledBy:    item.HandledBy,
		FirstAlarmAt: item.FirstAlarmAt,
		CreatedAt:    item.CreatedAt,
	}
}

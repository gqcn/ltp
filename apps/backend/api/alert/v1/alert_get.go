// 本文件定义告警详情接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetReq 读取告警详情与原始载荷。
type GetReq struct {
	g.Meta `path:"/alerts/{id}" method:"get" tags:"Alert" summary:"获取告警详情" dc:"返回解析字段与 FastX 原始 JSON。" permission:"ops:alert:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"告警 ID" eg:"1"`
}

// GetRes 是告警详情。
type GetRes struct {
	ListItem
	AlarmCount     int    `json:"alarmCount" dc:"FastX 告警次数" eg:"1"`
	AlarmLevel     int    `json:"alarmLevel" dc:"FastX 原始 level" eg:"2"`
	CreateUser     string `json:"createUser" dc:"FastX 创建人" eg:"jialing.wu"`
	WebhookPayload string `json:"webhookPayload" dc:"原始 Webhook JSON 字符串" eg:"{}"`
}

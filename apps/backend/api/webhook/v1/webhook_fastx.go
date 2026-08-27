// 本文件定义 FastX 告警 Webhook 接口契约，无需登录会话。

package v1

import "github.com/gogf/gf/v2/frame/g"

// FastXOriginalBody 是 FastX originalBody 字段。
type FastXOriginalBody struct {
	FaultName        string `json:"faultName" dc:"故障名称，映射为故障信息。" eg:"GPU-XID79卡故障-测试故障456"`
	FaultEnv         any    `json:"faultEnv" dc:"故障环境，可空。" eg:"null"`
	Cluster          any    `json:"cluster" dc:"FastX 集群字段，可空。" eg:"null"`
	HandlingStrategy string `json:"handlingStrategy" dc:"处理策略。" eg:"manual"`
}

// FastXAlarmInfo 是 FastX alarmInfo 字段。
type FastXAlarmInfo struct {
	RuleId         any     `json:"ruleId" dc:"规则 ID，可空。" eg:"null"`
	AlarmCount     int     `json:"alarmCount" dc:"告警次数" eg:"1"`
	Level          int     `json:"level" dc:"级别。1=info 2=warning >=3=critical。" eg:"2"`
	Name           string  `json:"name" dc:"告警标题" eg:"wjl-test-告警"`
	AlarmData      [][]any `json:"alarmData" dc:"二维表。首行为表头，其后每行为条件、当前值、标签。" eg:"[]"`
	FirstAlarmTime string  `json:"firstAlarmTime" dc:"首次告警时间，格式 2006-01-02 15:04:05.0" eg:"2026-08-18 16:50:52.0"`
	CreateUser     string  `json:"createUser" dc:"创建人" eg:"jialing.wu"`
}

// FastXIngestReq 接收 FastX 告警推送。
type FastXIngestReq struct {
	g.Meta       `path:"/webhooks/fastx/alerts" method:"post" tags:"Webhook" summary:"FastX 告警 Webhook" dc:"无需登录。若配置了 ops.fastx.webhookToken，请求必须携带相同的 X-FastX-Token 头或 token 查询参数。成功将告警以 open 状态入库并保存原始 JSON。"`
	Token        string            `json:"token" dc:"可选令牌，也可用查询参数 token 或请求头 X-FastX-Token。" eg:""`
	OriginalBody FastXOriginalBody `json:"originalBody" dc:"FastX 原始故障体"`
	AlarmInfo    FastXAlarmInfo    `json:"alarmInfo" dc:"FastX 告警信息"`
}

// FastXIngestRes 返回新建告警 ID。
type FastXIngestRes struct {
	Id int64 `json:"id" dc:"新建告警 ID" eg:"1"`
}

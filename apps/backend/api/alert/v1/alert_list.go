// 本文件定义告警列表与汇总接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询分页告警。
type ListReq struct {
	g.Meta    `path:"/alerts" method:"get" tags:"Alert" summary:"列出告警" dc:"按级别、处理状态、时间范围和关键词筛选告警。clusterId 为 0 或不传表示全部集群。" permission:"ops:alert:query"`
	ClusterId int64  `json:"clusterId" dc:"可选工作集群 ID。0 或不传表示全部集群。" eg:"1"`
	PageNum   int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize  int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。" eg:"10"`
	Keyword   string `json:"keyword" dc:"可选模糊匹配标题、告警信息、故障信息或节点名。" eg:"XID"`
	Severity  string `json:"severity" dc:"可选级别。all 或不传表示全部；info / warning / critical。" eg:"critical"`
	Status    string `json:"status" dc:"可选处理状态。all 或不传表示全部；open / following / handled。" eg:"open"`
	Range     string `json:"range" dc:"可选时间范围。1h / 6h / 24h / 7d / 30d / all。默认 24h。" eg:"24h"`
}

// ListItem 是列表中的一条告警。
type ListItem struct {
	Id           int64  `json:"id" dc:"告警 ID" eg:"1"`
	DisplayId    string `json:"displayId" dc:"展示编号，如 ALT-1" eg:"ALT-1"`
	ClusterId    int64  `json:"clusterId" dc:"关联集群 ID。未关联时为 0。" eg:"0"`
	Severity     string `json:"severity" dc:"级别。info / warning / critical。" eg:"warning"`
	Title        string `json:"title" dc:"标题" eg:"wjl-test-告警"`
	AlertInfo    string `json:"alertInfo" dc:"告警信息" eg:"FastX 上报 GPU 利用率告警"`
	FaultInfo    string `json:"faultInfo" dc:"故障信息，可空" eg:"GPU-XID79卡故障-测试故障456"`
	Source       string `json:"source" dc:"来源" eg:"FastX"`
	NodeNames    string `json:"nodeNames" dc:"节点名，逗号分隔" eg:"msxf-hpc-2-125-ai"`
	Status       string `json:"status" dc:"处理状态。open / following / handled。" eg:"open"`
	HandleRemark string `json:"handleRemark" dc:"最近处理备注" eg:""`
	HandledAt    int64  `json:"handledAt" dc:"最近处理时间，Unix 毫秒时间戳。未处理为 0。" eg:"0"`
	HandledBy    string `json:"handledBy" dc:"最近处理人" eg:""`
	FirstAlarmAt int64  `json:"firstAlarmAt" dc:"首次告警时间，Unix 毫秒时间戳" eg:"1755511852000"`
	CreatedAt    int64  `json:"createdAt" dc:"入库时间，Unix 毫秒时间戳" eg:"1755511852000"`
}

// ListSummary 是筛选前的库存 KPI。
type ListSummary struct {
	Total      int `json:"total" dc:"告警总数" eg:"3"`
	Open       int `json:"open" dc:"待处理" eg:"2"`
	Following  int `json:"following" dc:"跟进中" eg:"0"`
	Handled    int `json:"handled" dc:"已完成" eg:"1"`
	Critical   int `json:"critical" dc:"critical 级别" eg:"1"`
	Warning    int `json:"warning" dc:"warning 级别" eg:"1"`
	Info       int `json:"info" dc:"info 级别" eg:"1"`
	Unfinished int `json:"unfinished" dc:"待处理 + 跟进中，供侧栏角标" eg:"2"`
}

// ListRes 是分页告警列表。
type ListRes struct {
	List    []*ListItem `json:"list" dc:"当前页告警"`
	Total   int         `json:"total" dc:"筛选后总数" eg:"2"`
	Summary ListSummary `json:"summary" dc:"未筛选 KPI，供页面统计与角标"`
}

// SummaryReq 仅返回未完成数量，供侧栏角标。
type SummaryReq struct {
	g.Meta `path:"/alerts/summary" method:"get" tags:"Alert" summary:"告警汇总" dc:"返回未完成告警数量，供侧栏角标。不返回列表。" permission:"ops:alert:query"`
}

// SummaryRes 是角标汇总。
type SummaryRes struct {
	Unfinished int `json:"unfinished" dc:"待处理 + 跟进中" eg:"2"`
	Open       int `json:"open" dc:"待处理" eg:"2"`
	Following  int `json:"following" dc:"跟进中" eg:"0"`
}

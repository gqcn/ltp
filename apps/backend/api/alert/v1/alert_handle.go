// 本文件定义告警处理接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateStatusReq 处理单条告警。
type UpdateStatusReq struct {
	g.Meta `path:"/alerts/{id}/status" method:"put" tags:"Alert" summary:"处理告警" dc:"将告警状态改为 following 或 handled，并记录备注与处理人。" permission:"ops:alert:update"`
	Id     int64  `json:"id" v:"required|min:1" dc:"告警 ID" eg:"1"`
	Status string `json:"status" v:"required|in:open,following,handled#请选择处理状态|告警状态无效" dc:"目标状态。open=待处理 following=跟进中 handled=已完成。" eg:"handled"`
	Remark string `json:"remark" v:"max-length:256#最长 256 个字符" dc:"处理备注" eg:"已整节点隔离"`
}

// UpdateStatusRes 为空。
type UpdateStatusRes struct{}

// BatchUpdateStatusReq 批量处理告警。
type BatchUpdateStatusReq struct {
	g.Meta `path:"/alerts/status" method:"put" tags:"Alert" summary:"批量处理告警" dc:"将最多 100 条告警更新为同一状态。" permission:"ops:alert:update"`
	Ids    []int64 `json:"ids" v:"required|min-length:1#请选择告警|请选择告警" dc:"告警 ID 列表，最多 100 个。" eg:"[1,2]"`
	Status string  `json:"status" v:"required|in:open,following,handled#请选择处理状态|告警状态无效" dc:"目标状态" eg:"handled"`
	Remark string  `json:"remark" v:"max-length:256#最长 256 个字符" dc:"处理备注" eg:"批量确认"`
}

// BatchUpdateStatusRes 为空。
type BatchUpdateStatusRes struct{}

// 本文件定义节点维护记录列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// EventListReq 查询节点维护记录。
type EventListReq struct {
	g.Meta    `path:"/node-events" method:"get" tags:"Node" summary:"列出维护记录" dc:"按集群与可选节点名分页查询隔离、入池、数据中心、标签、污点记录。按时间倒序。" permission:"ops:node:query"`
	ClusterId int64  `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	NodeName  string `json:"nodeName" dc:"可选节点名精确过滤。空表示该集群全部记录。" eg:"ltp-control-plane"`
	PageNum   int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize  int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。" eg:"10"`
}

// EventItem 是一条维护记录。
type EventItem struct {
	Id        int64  `json:"id" dc:"记录 ID" eg:"1"`
	ClusterId int64  `json:"clusterId" dc:"集群 ID" eg:"1"`
	NodeName  string `json:"nodeName" dc:"节点名" eg:"ltp-control-plane"`
	Action    string `json:"action" dc:"动作。isolate / recover / set-dc / labels / taints。" eg:"isolate"`
	Operator  string `json:"operator" dc:"操作者显示名" eg:"admin"`
	Remark    string `json:"remark" dc:"备注" eg:"计划维护"`
	Result    string `json:"result" dc:"结果。success / fail。" eg:"success"`
	CreatedAt int64  `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// EventListRes 是分页维护记录。
type EventListRes struct {
	List  []*EventItem `json:"list" dc:"当前页记录"`
	Total int          `json:"total" dc:"筛选后总数" eg:"3"`
}

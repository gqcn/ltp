// 本文件定义队列详情接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetReq 读取一条队列。
type GetReq struct {
	g.Meta `path:"/queues/{id}" method:"get" tags:"Queue" summary:"获取队列详情" dc:"返回业务队列元数据与 Volcano 实时已用。" permission:"ops:queue:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"队列 ID" eg:"1"`
}

// GetRes 是队列详情。
type GetRes struct {
	ListItem
}

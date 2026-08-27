// 本文件定义删除队列接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteReq 删除业务队列及对应 Volcano Queue。
type DeleteReq struct {
	g.Meta `path:"/queues/{id}" method:"delete" tags:"Queue" summary:"删除队列" dc:"若 Volcano 报告运行中或排队占用大于 0 则拒绝。允许时先删 CR 再软删业务行并解除团队关联。" permission:"ops:queue:delete"`
	Id     int64 `json:"id" v:"required|min:1" dc:"队列 ID" eg:"1"`
}

// DeleteRes 为空。
type DeleteRes struct{}

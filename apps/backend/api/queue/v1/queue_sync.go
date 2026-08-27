// 本文件定义将业务队列重新写入 Volcano Queue 的接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// SyncReq 按库中元数据创建或更新 Volcano Queue。
type SyncReq struct {
	g.Meta `path:"/queues/{id}/sync" method:"post" tags:"Queue" summary:"重新同步 Volcano Queue" dc:"用库中的额度与注解创建或更新集群中的 Queue CR。用于集群重建后 CR 丢失。标识不可改。" permission:"ops:queue:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"队列 ID" eg:"1"`
}

// SyncRes 为空。
type SyncRes struct{}

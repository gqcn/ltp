// 本文件定义删除集群接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteReq 软删除接入集群。
type DeleteReq struct {
	g.Meta `path:"/clusters/{id}" method:"delete" tags:"Cluster" summary:"删除集群" dc:"断开与该 Kubernetes 集群的连接。所属节点不再出现在节点管理。已创建的业务队列仍保留历史行但无法再同步。" permission:"ops:cluster:delete"`
	Id     int64 `json:"id" v:"required|min:1" dc:"集群 ID" eg:"1"`
}

// DeleteRes 为空。
type DeleteRes struct{}

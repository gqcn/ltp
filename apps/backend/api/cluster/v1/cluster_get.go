// 本文件定义集群详情接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetReq 读取一条集群详情。
type GetReq struct {
	g.Meta `path:"/clusters/{id}" method:"get" tags:"Cluster" summary:"获取集群详情" dc:"返回集群元数据与实时用量。Kubeconfig 明文不返回。" permission:"ops:cluster:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"集群 ID" eg:"1"`
}

// GetRes 是集群详情。
type GetRes struct {
	ListItem
}

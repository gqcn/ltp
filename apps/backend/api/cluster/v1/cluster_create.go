// 本文件定义接入集群接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateReq 使用 Kubeconfig 接入集群。
type CreateReq struct {
	g.Meta      `path:"/clusters" method:"post" tags:"Cluster" summary:"接入集群" dc:"用完整 Kubeconfig 接入一个对等 Kubernetes 集群。接入时立即探测 API Server，失败不落库。Kubeconfig 明文不会出现在响应中。" permission:"ops:cluster:create"`
	DisplayName string `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称，集群间不可重复。" eg:"训练集群"`
	Description string `json:"description" v:"max-length:256#最长 256 个字符" dc:"可选说明。" eg:"kind 本地实验集群"`
	Kubeconfig  string `json:"kubeconfig" v:"required#请填写 Kubeconfig" dc:"完整 kubeconfig YAML。不受默认多行 256 限制。" eg:"apiVersion: v1\nkind: Config\n"`
}

// CreateRes 返回新建集群 ID。
type CreateRes struct {
	Id int64 `json:"id" dc:"新建集群 ID" eg:"1"`
}

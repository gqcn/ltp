// 本文件定义编辑集群接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateReq 修改集群显示信息，可选覆盖 Kubeconfig。
type UpdateReq struct {
	g.Meta      `path:"/clusters/{id}" method:"put" tags:"Cluster" summary:"编辑集群" dc:"修改显示名称与说明。Kubeconfig 留空表示沿用已保存凭证；重新粘贴将覆盖并重新探测。" permission:"ops:cluster:update"`
	Id          int64  `json:"id" v:"required|min:1" dc:"集群 ID" eg:"1"`
	DisplayName string `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"训练集群"`
	Description string `json:"description" v:"max-length:256#最长 256 个字符" dc:"说明" eg:"kind 本地实验集群"`
	Kubeconfig  string `json:"kubeconfig" dc:"可选。留空沿用已保存凭证，非空则覆盖。完整 YAML，不受默认多行 256 限制。" eg:""`
}

// UpdateRes 为空。
type UpdateRes struct{}

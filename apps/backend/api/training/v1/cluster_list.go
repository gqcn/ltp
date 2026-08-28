// 本文件定义训练中心工作集群列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListClustersReq 列出可供训练使用的接入集群。
type ListClustersReq struct {
	g.Meta `path:"/training/clusters" method:"get" tags:"Training" summary:"列出训练工作集群" dc:"返回接入集群的精简投影，供训练中心工作集群选择。不含 Kubeconfig。" permission:"training:cluster:query"`
}

// ClusterItem 是训练侧集群投影。
type ClusterItem struct {
	Id          int64  `json:"id" dc:"集群 ID" eg:"1"`
	Name        string `json:"name" dc:"稳定标识" eg:"ltp"`
	DisplayName string `json:"displayName" dc:"显示名称" eg:"kind 实验集群"`
	Status      string `json:"status" dc:"连通状态。healthy / offline / unknown。" eg:"healthy"`
}

// ListClustersRes 是训练工作集群列表。
type ListClustersRes struct {
	List []*ClusterItem `json:"list" dc:"集群列表"`
}

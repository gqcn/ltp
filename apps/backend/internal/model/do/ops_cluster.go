// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsCluster is the golang structure of table ops_cluster for DAO operations like Where/Data.
type OpsCluster struct {
	g.Meta      `orm:"table:ops_cluster, do:true"`
	Id          any         // 集群 ID
	Name        any         // 由显示名称派生的稳定标识
	DisplayName any         // 显示名称
	Description any         // 说明
	Kubeconfig  any         // Kubeconfig YAML，接口响应不回传
	ApiServer   any         // 探测得到的 API Server 地址
	K8SVersion  any         // 探测得到的 Kubernetes 版本
	Status      any         // 连通状态：healthy / offline / unknown
	LastSyncAt  *gtime.Time // 最近一次成功连通时间
	CreatedAt   *gtime.Time // 创建时间
	UpdatedAt   *gtime.Time // 更新时间
	DeletedAt   *gtime.Time // 删除时间
}

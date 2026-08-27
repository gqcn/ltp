// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsCluster is the golang structure for table ops_cluster.
type OpsCluster struct {
	Id          int64       `json:"id"          orm:"id"           description:"集群 ID"`
	Name        string      `json:"name"        orm:"name"         description:"由显示名称派生的稳定标识"`
	DisplayName string      `json:"displayName" orm:"display_name" description:"显示名称"`
	Description string      `json:"description" orm:"description"  description:"说明"`
	Kubeconfig  string      `json:"kubeconfig"  orm:"kubeconfig"   description:"Kubeconfig YAML，接口响应不回传"`
	ApiServer   string      `json:"apiServer"   orm:"api_server"   description:"探测得到的 API Server 地址"`
	K8SVersion  string      `json:"k8SVersion"  orm:"k8s_version"  description:"探测得到的 Kubernetes 版本"`
	Status      string      `json:"status"      orm:"status"       description:"连通状态：healthy / offline / unknown"`
	LastSyncAt  *gtime.Time `json:"lastSyncAt"  orm:"last_sync_at" description:"最近一次成功连通时间"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"   description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"   description:"更新时间"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"   description:"删除时间"`
}

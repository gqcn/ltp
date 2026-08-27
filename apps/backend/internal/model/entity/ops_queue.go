// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsQueue is the golang structure for table ops_queue.
type OpsQueue struct {
	Id             int64       `json:"id"             orm:"id"              description:"队列 ID"`
	ClusterId      int64       `json:"clusterId"      orm:"cluster_id"      description:"所属集群 ID"`
	Name           string      `json:"name"           orm:"name"            description:"Volcano Queue 对象名，创建后不可改"`
	DisplayName    string      `json:"displayName"    orm:"display_name"    description:"显示名称"`
	DatacenterCode string      `json:"datacenterCode" orm:"datacenter_code" description:"绑定的数据中心标识"`
	GpuType        string      `json:"gpuType"        orm:"gpu_type"        description:"卡型号"`
	GpuQuota       int         `json:"gpuQuota"       orm:"gpu_quota"       description:"GPU 额度（卡）"`
	CpuQuota       int         `json:"cpuQuota"       orm:"cpu_quota"       description:"CPU 额度（核）"`
	MemQuotaGi     int         `json:"memQuotaGi"     orm:"mem_quota_gi"    description:"内存额度（GiB）"`
	Weight         int         `json:"weight"         orm:"weight"          description:"Volcano 队列权重"`
	Reclaimable    bool        `json:"reclaimable"    orm:"reclaimable"     description:"是否允许回收"`
	Features       string      `json:"features"       orm:"features"        description:"功能特性 JSON 数组，例如 [\"ib\"]"`
	Description    string      `json:"description"    orm:"description"     description:"说明"`
	CreatedAt      *gtime.Time `json:"createdAt"      orm:"created_at"      description:"创建时间"`
	UpdatedAt      *gtime.Time `json:"updatedAt"      orm:"updated_at"      description:"更新时间"`
	DeletedAt      *gtime.Time `json:"deletedAt"      orm:"deleted_at"      description:"删除时间"`
}

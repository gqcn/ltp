// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsDatacenter is the golang structure for table ops_datacenter.
type OpsDatacenter struct {
	Id          int64       `json:"id"          orm:"id"          description:"数据中心 ID"`
	Code        string      `json:"code"        orm:"code"        description:"不可变业务标识，作为 maip.io/datacenter 标签值"`
	Name        string      `json:"name"        orm:"name"        description:"显示名称"`
	ShortName   string      `json:"shortName"   orm:"short_name"  description:"列表角标使用的简称"`
	Region      string      `json:"region"      orm:"region"      description:"区域文本"`
	LabelKey    string      `json:"labelKey"    orm:"label_key"   description:"Kubernetes 标签键，固定为 maip.io/datacenter"`
	Color       string      `json:"color"       orm:"color"       description:"角标颜色，格式 #RRGGBB"`
	Description string      `json:"description" orm:"description" description:"说明"`
	Enabled     bool        `json:"enabled"     orm:"enabled"     description:"新建资源是否可选该数据中心"`
	IsDefault   bool        `json:"isDefault"   orm:"is_default"  description:"是否为内置默认数据中心"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"  description:"创建时间"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"  description:"更新时间"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"  description:"删除时间"`
}

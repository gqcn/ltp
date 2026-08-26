// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsDatacenter is the golang structure for table ops_datacenter.
type OpsDatacenter struct {
	Id          int64       `json:"id"          orm:"id"          description:"Datacenter ID"`
	Code        string      `json:"code"        orm:"code"        description:"Immutable business code used as maip.io/datacenter label value"`
	Name        string      `json:"name"        orm:"name"        description:"Display name"`
	ShortName   string      `json:"shortName"   orm:"short_name"  description:"Short name used in badges"`
	Region      string      `json:"region"      orm:"region"      description:"Region text"`
	LabelKey    string      `json:"labelKey"    orm:"label_key"   description:"Kubernetes label key, always maip.io/datacenter"`
	Color       string      `json:"color"       orm:"color"       description:"Badge color in #RRGGBB"`
	Description string      `json:"description" orm:"description" description:"Description"`
	Enabled     bool        `json:"enabled"     orm:"enabled"     description:"Whether the datacenter can be selected by new resources"`
	IsDefault   bool        `json:"isDefault"   orm:"is_default"  description:"Whether this is the built-in default datacenter"`
	CreatedAt   *gtime.Time `json:"createdAt"   orm:"created_at"  description:"Creation time"`
	UpdatedAt   *gtime.Time `json:"updatedAt"   orm:"updated_at"  description:"Update time"`
	DeletedAt   *gtime.Time `json:"deletedAt"   orm:"deleted_at"  description:"Deletion time"`
}

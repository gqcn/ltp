// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsDatacenter is the golang structure of table ops_datacenter for DAO operations like Where/Data.
type OpsDatacenter struct {
	g.Meta      `orm:"table:ops_datacenter, do:true"`
	Id          any         // Datacenter ID
	Code        any         // Immutable business code used as maip.io/datacenter label value
	Name        any         // Display name
	ShortName   any         // Short name used in badges
	Region      any         // Region text
	LabelKey    any         // Kubernetes label key, always maip.io/datacenter
	Color       any         // Badge color in #RRGGBB
	Description any         // Description
	Enabled     any         // Whether the datacenter can be selected by new resources
	IsDefault   any         // Whether this is the built-in default datacenter
	CreatedAt   *gtime.Time // Creation time
	UpdatedAt   *gtime.Time // Update time
	DeletedAt   *gtime.Time // Deletion time
}

// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsDatacenterDao is the data access object for the table ops_datacenter.
type OpsDatacenterDao struct {
	table    string               // table is the underlying table name of the DAO.
	group    string               // group is the database configuration group name of the current DAO.
	columns  OpsDatacenterColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler   // handlers for customized model modification.
}

// OpsDatacenterColumns defines and stores column names for the table ops_datacenter.
type OpsDatacenterColumns struct {
	Id          string // Datacenter ID
	Code        string // Immutable business code used as maip.io/datacenter label value
	Name        string // Display name
	ShortName   string // Short name used in badges
	Region      string // Region text
	LabelKey    string // Kubernetes label key, always maip.io/datacenter
	Color       string // Badge color in #RRGGBB
	Description string // Description
	Enabled     string // Whether the datacenter can be selected by new resources
	IsDefault   string // Whether this is the built-in default datacenter
	CreatedAt   string // Creation time
	UpdatedAt   string // Update time
	DeletedAt   string // Deletion time
}

// opsDatacenterColumns holds the columns for the table ops_datacenter.
var opsDatacenterColumns = OpsDatacenterColumns{
	Id:          "id",
	Code:        "code",
	Name:        "name",
	ShortName:   "short_name",
	Region:      "region",
	LabelKey:    "label_key",
	Color:       "color",
	Description: "description",
	Enabled:     "enabled",
	IsDefault:   "is_default",
	CreatedAt:   "created_at",
	UpdatedAt:   "updated_at",
	DeletedAt:   "deleted_at",
}

// NewOpsDatacenterDao creates and returns a new DAO object for table data access.
func NewOpsDatacenterDao(handlers ...gdb.ModelHandler) *OpsDatacenterDao {
	return &OpsDatacenterDao{
		group:    "default",
		table:    "ops_datacenter",
		columns:  opsDatacenterColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsDatacenterDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsDatacenterDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsDatacenterDao) Columns() OpsDatacenterColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsDatacenterDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsDatacenterDao) Ctx(ctx context.Context) *gdb.Model {
	model := dao.DB().Model(dao.table)
	for _, handler := range dao.handlers {
		model = handler(model)
	}
	return model.Safe().Ctx(ctx)
}

// Transaction wraps the transaction logic using function f.
// It rolls back the transaction and returns the error if function f returns a non-nil error.
// It commits the transaction and returns nil if function f returns nil.
//
// Note: Do not commit or roll back the transaction in function f,
// as it is automatically handled by this function.
func (dao *OpsDatacenterDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

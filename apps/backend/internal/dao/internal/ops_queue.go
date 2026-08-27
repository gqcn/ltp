// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsQueueDao is the data access object for the table ops_queue.
type OpsQueueDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  OpsQueueColumns    // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// OpsQueueColumns defines and stores column names for the table ops_queue.
type OpsQueueColumns struct {
	Id             string // 队列 ID
	ClusterId      string // 所属集群 ID
	Name           string // Volcano Queue 对象名，创建后不可改
	DisplayName    string // 显示名称
	DatacenterCode string // 绑定的数据中心标识
	GpuType        string // 卡型号
	GpuQuota       string // GPU 额度（卡）
	CpuQuota       string // CPU 额度（核）
	MemQuotaGi     string // 内存额度（GiB）
	Weight         string // Volcano 队列权重
	Reclaimable    string // 是否允许回收
	Features       string // 功能特性 JSON 数组，例如 ["ib"]
	Description    string // 说明
	CreatedAt      string // 创建时间
	UpdatedAt      string // 更新时间
	DeletedAt      string // 删除时间
}

// opsQueueColumns holds the columns for the table ops_queue.
var opsQueueColumns = OpsQueueColumns{
	Id:             "id",
	ClusterId:      "cluster_id",
	Name:           "name",
	DisplayName:    "display_name",
	DatacenterCode: "datacenter_code",
	GpuType:        "gpu_type",
	GpuQuota:       "gpu_quota",
	CpuQuota:       "cpu_quota",
	MemQuotaGi:     "mem_quota_gi",
	Weight:         "weight",
	Reclaimable:    "reclaimable",
	Features:       "features",
	Description:    "description",
	CreatedAt:      "created_at",
	UpdatedAt:      "updated_at",
	DeletedAt:      "deleted_at",
}

// NewOpsQueueDao creates and returns a new DAO object for table data access.
func NewOpsQueueDao(handlers ...gdb.ModelHandler) *OpsQueueDao {
	return &OpsQueueDao{
		group:    "default",
		table:    "ops_queue",
		columns:  opsQueueColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsQueueDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsQueueDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsQueueDao) Columns() OpsQueueColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsQueueDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsQueueDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsQueueDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

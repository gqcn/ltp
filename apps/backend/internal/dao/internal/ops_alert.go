// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// OpsAlertDao is the data access object for the table ops_alert.
type OpsAlertDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  OpsAlertColumns    // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// OpsAlertColumns defines and stores column names for the table ops_alert.
type OpsAlertColumns struct {
	Id             string // 告警 ID
	ClusterId      string // 可选关联集群 ID
	Severity       string // 级别：info / warning / critical
	Title          string // 告警标题
	AlertInfo      string // 面向用户的告警信息
	FaultInfo      string // 故障信息，可空
	Source         string // 来源
	NodeNames      string // 从标签解析的节点名，逗号分隔
	Status         string // 处理状态：open / following / handled
	HandleRemark   string // 最近处理备注
	HandledAt      string // 最近处理时间
	HandledBy      string // 最近处理人
	FirstAlarmAt   string // FastX 首次告警时间
	AlarmCount     string // FastX 告警次数
	AlarmLevel     string // FastX 原始 level
	CreateUser     string // FastX 创建人
	WebhookPayload string // 原始 Webhook JSON
	CreatedAt      string // 入库时间
	UpdatedAt      string // 更新时间
}

// opsAlertColumns holds the columns for the table ops_alert.
var opsAlertColumns = OpsAlertColumns{
	Id:             "id",
	ClusterId:      "cluster_id",
	Severity:       "severity",
	Title:          "title",
	AlertInfo:      "alert_info",
	FaultInfo:      "fault_info",
	Source:         "source",
	NodeNames:      "node_names",
	Status:         "status",
	HandleRemark:   "handle_remark",
	HandledAt:      "handled_at",
	HandledBy:      "handled_by",
	FirstAlarmAt:   "first_alarm_at",
	AlarmCount:     "alarm_count",
	AlarmLevel:     "alarm_level",
	CreateUser:     "create_user",
	WebhookPayload: "webhook_payload",
	CreatedAt:      "created_at",
	UpdatedAt:      "updated_at",
}

// NewOpsAlertDao creates and returns a new DAO object for table data access.
func NewOpsAlertDao(handlers ...gdb.ModelHandler) *OpsAlertDao {
	return &OpsAlertDao{
		group:    "default",
		table:    "ops_alert",
		columns:  opsAlertColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *OpsAlertDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *OpsAlertDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *OpsAlertDao) Columns() OpsAlertColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *OpsAlertDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *OpsAlertDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *OpsAlertDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

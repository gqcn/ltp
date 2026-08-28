// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// TrainConfigSetDao is the data access object for the table train_config_set.
type TrainConfigSetDao struct {
	table    string                // table is the underlying table name of the DAO.
	group    string                // group is the database configuration group name of the current DAO.
	columns  TrainConfigSetColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler    // handlers for customized model modification.
}

// TrainConfigSetColumns defines and stores column names for the table train_config_set.
type TrainConfigSetColumns struct {
	Id            string // 配置集 ID
	Name          string // 由显示名称派生的稳定标识
	DisplayName   string // 显示名称
	TeamId        string // 所属团队
	Framework     string // 框架：megatron / nemo / accelerate / custom
	Visibility    string // 可见性：team / private
	Status        string // 状态：active / archived
	OwnerUserId   string // 创建人 ID
	OwnerUsername string // 创建人账号
	OwnerNickname string // 创建人显示名
	Description   string // 描述
	LatestVersion string // 最新已发布版本号，0 表示尚无版本
	CreatedAt     string // 创建时间
	UpdatedAt     string // 更新时间
	DeletedAt     string // 删除时间
}

// trainConfigSetColumns holds the columns for the table train_config_set.
var trainConfigSetColumns = TrainConfigSetColumns{
	Id:            "id",
	Name:          "name",
	DisplayName:   "display_name",
	TeamId:        "team_id",
	Framework:     "framework",
	Visibility:    "visibility",
	Status:        "status",
	OwnerUserId:   "owner_user_id",
	OwnerUsername: "owner_username",
	OwnerNickname: "owner_nickname",
	Description:   "description",
	LatestVersion: "latest_version",
	CreatedAt:     "created_at",
	UpdatedAt:     "updated_at",
	DeletedAt:     "deleted_at",
}

// NewTrainConfigSetDao creates and returns a new DAO object for table data access.
func NewTrainConfigSetDao(handlers ...gdb.ModelHandler) *TrainConfigSetDao {
	return &TrainConfigSetDao{
		group:    "default",
		table:    "train_config_set",
		columns:  trainConfigSetColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *TrainConfigSetDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *TrainConfigSetDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *TrainConfigSetDao) Columns() TrainConfigSetColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *TrainConfigSetDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *TrainConfigSetDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *TrainConfigSetDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// TrainConfigVersionDao is the data access object for the table train_config_version.
type TrainConfigVersionDao struct {
	table    string                    // table is the underlying table name of the DAO.
	group    string                    // group is the database configuration group name of the current DAO.
	columns  TrainConfigVersionColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler        // handlers for customized model modification.
}

// TrainConfigVersionColumns defines and stores column names for the table train_config_version.
type TrainConfigVersionColumns struct {
	Id             string // 版本行 ID
	SetId          string // 配置集 ID
	Version        string // 版本号，从 1 递增
	Message        string // 版本说明
	AuthorUserId   string // 发布人 ID
	AuthorUsername string // 发布人账号
	AuthorNickname string // 发布人显示名
	Digest         string // 文件内容摘要
	Files          string // 文件数组 JSON，含 path 与 content
	CreatedAt      string // 发布时间
	UpdatedAt      string // 更新时间
}

// trainConfigVersionColumns holds the columns for the table train_config_version.
var trainConfigVersionColumns = TrainConfigVersionColumns{
	Id:             "id",
	SetId:          "set_id",
	Version:        "version",
	Message:        "message",
	AuthorUserId:   "author_user_id",
	AuthorUsername: "author_username",
	AuthorNickname: "author_nickname",
	Digest:         "digest",
	Files:          "files",
	CreatedAt:      "created_at",
	UpdatedAt:      "updated_at",
}

// NewTrainConfigVersionDao creates and returns a new DAO object for table data access.
func NewTrainConfigVersionDao(handlers ...gdb.ModelHandler) *TrainConfigVersionDao {
	return &TrainConfigVersionDao{
		group:    "default",
		table:    "train_config_version",
		columns:  trainConfigVersionColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *TrainConfigVersionDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *TrainConfigVersionDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *TrainConfigVersionDao) Columns() TrainConfigVersionColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *TrainConfigVersionDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *TrainConfigVersionDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *TrainConfigVersionDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

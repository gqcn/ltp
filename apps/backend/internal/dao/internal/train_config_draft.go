// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// TrainConfigDraftDao is the data access object for the table train_config_draft.
type TrainConfigDraftDao struct {
	table    string                  // table is the underlying table name of the DAO.
	group    string                  // group is the database configuration group name of the current DAO.
	columns  TrainConfigDraftColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler      // handlers for customized model modification.
}

// TrainConfigDraftColumns defines and stores column names for the table train_config_draft.
type TrainConfigDraftColumns struct {
	Id            string // 草稿 ID
	SetId         string // 配置集 ID
	OwnerUserId   string // 草稿所有人 ID
	OwnerUsername string // 草稿所有人账号
	OwnerNickname string // 草稿所有人显示名
	Message       string // 拟发布版本说明
	Files         string // 草稿文件 JSON 数组
	CreatedAt     string // 创建时间
	UpdatedAt     string // 更新时间
}

// trainConfigDraftColumns holds the columns for the table train_config_draft.
var trainConfigDraftColumns = TrainConfigDraftColumns{
	Id:            "id",
	SetId:         "set_id",
	OwnerUserId:   "owner_user_id",
	OwnerUsername: "owner_username",
	OwnerNickname: "owner_nickname",
	Message:       "message",
	Files:         "files",
	CreatedAt:     "created_at",
	UpdatedAt:     "updated_at",
}

// NewTrainConfigDraftDao creates and returns a new DAO object for table data access.
func NewTrainConfigDraftDao(handlers ...gdb.ModelHandler) *TrainConfigDraftDao {
	return &TrainConfigDraftDao{
		group:    "default",
		table:    "train_config_draft",
		columns:  trainConfigDraftColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *TrainConfigDraftDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *TrainConfigDraftDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *TrainConfigDraftDao) Columns() TrainConfigDraftColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *TrainConfigDraftDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *TrainConfigDraftDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *TrainConfigDraftDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}

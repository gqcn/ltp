// Package expproject 管理实验项目的创建、名称、描述与删除。
package expproject

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/team"
)

const (
	// DefaultName 是任务自动关联的 Seed 项目标识。
	DefaultName = "default"
	maxNameLen  = 64
	maxDescLen  = 256
)

// Actor 是当前会话身份。
type Actor struct {
	UserID   int64  // 用户 ID
	Username string // 账号
	Nickname string // 显示名
	IsAdmin  bool   // 是否本地平台管理员
	SeeAll   bool   // 是否可看全部团队数据（管理员或 SRE）
}

// seesAllTeams 表示 Run 计数不受团队成员关系限制。
func (a Actor) seesAllTeams() bool {
	return a.IsAdmin || a.SeeAll
}

// Item 是项目投影。
type Item struct {
	ID          int64  // 主键
	Name        string // 名称
	DisplayName string // 显示名
	Description string // 描述
	RunCount    int    // 可见 Run 数
	CreatedAt   int64  // 创建
	UpdatedAt   int64  // 更新
}

// ListInput 是列表条件。
type ListInput struct {
	Actor     Actor // 调用方
	ClusterID int64 // 集群
}

// Service 定义实验项目操作。
type Service interface {
	// List 返回项目及当前集群可见 Run 计数。
	List(ctx context.Context, in ListInput) ([]*Item, error)
	// Get 返回单条项目。
	Get(ctx context.Context, id int64) (*Item, error)
	// DefaultID 返回 Seed 默认项目 ID。
	DefaultID(ctx context.Context) (int64, error)
	// Create 创建项目，名称在未删除范围内唯一。
	Create(ctx context.Context, actor Actor, name, desc string) (int64, error)
	// Update 更新名称与描述。名称须在未删除范围内唯一。默认项目标识不可改，只更新描述。空名称返回校验错误。
	Update(ctx context.Context, actor Actor, id int64, name, desc string) error
	// Delete 软删除非默认项目，其下 Run 改挂到默认项目。默认项目返回中文错误。
	Delete(ctx context.Context, actor Actor, id int64) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	teamSvc team.Service // 团队，用于 Run 计数的可见性
}

// New 构造实验项目服务。
func New(teamSvc team.Service) (Service, error) {
	if teamSvc == nil {
		return nil, gerror.New("team service is required")
	}
	return &serviceImpl{teamSvc: teamSvc}, nil
}

func normalizeName(name string) string {
	return strings.TrimSpace(name)
}

func normalizeDesc(desc string) string {
	return strings.TrimSpace(desc)
}

// Package team 实现虚拟团队的创建、查询与成员维护。
package team

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/user"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
)

// Owner 是负责人投影。
type Owner struct {
	ID       int64  // 用户主键
	Username string // 登录账号
	Nickname string // 显示名称
}

// Member 是团队成员投影。
type Member struct {
	ID         int64  // 用户主键
	Username   string // 登录账号
	Nickname   string // 显示名称
	Email      string // 邮箱
	Department string // 部门
}

// Item 是团队列表投影。
type Item struct {
	ID          int64  // 主键
	Name        string // 团队名称
	Description string // 描述
	Owner       Owner  // 负责人
	MemberCount int    // 成员数
	CreatedAt   int64  // 创建时间
}

// Detail 是团队详情。
type Detail struct {
	Item               // 列表投影
	Members   []Member // 成员列表
	UpdatedAt int64    // 更新时间
}

// ListInput 是列表查询条件。
type ListInput struct {
	PageNum  int    // 页码，从 1 开始
	PageSize int    // 每页条数
	Keyword  string // 名称关键词
}

// ListOutput 是分页列表结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 筛选后总数
}

// CreateInput 是创建命令。
type CreateInput struct {
	Name        string // 团队名称
	Description string // 描述
	OwnerUserID int64  // 负责人用户 ID
}

// UpdateInput 是更新命令。
type UpdateInput struct {
	ID          int64  // 主键
	Name        string // 团队名称
	Description string // 描述
	OwnerUserID int64  // 负责人用户 ID
}

// Service 暴露团队管理操作。
type Service interface {
	// List 返回经过筛选和分页的团队列表。负责人与成员数批量装配。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回团队详情与成员列表。
	Get(ctx context.Context, id int64) (*Detail, error)
	// Create 创建团队并将负责人加入成员。
	Create(ctx context.Context, in CreateInput) (int64, error)
	// Update 修改名称、描述与负责人。
	Update(ctx context.Context, in UpdateInput) error
	// AddMember 添加启用中的平台用户。已在团队中则保持幂等成功。
	AddMember(ctx context.Context, teamID int64, userID int64) error
	// RemoveMember 解除成员关系。
	RemoveMember(ctx context.Context, teamID int64, userID int64) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	userSvc user.Service // 用户服务
}

// New 构造团队服务。userSvc 不得为空。
func New(userSvc user.Service) (Service, error) {
	if userSvc == nil {
		return nil, gerror.New("user service is required")
	}
	return &serviceImpl{userSvc: userSvc}, nil
}

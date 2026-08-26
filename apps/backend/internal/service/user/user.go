// Package user 实现平台 LDAP 用户的查询、加入、启停、授权与移除。
package user

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxBatchIDs    = 100
)

// TeamRef 是用户所属团队投影。
type TeamRef struct {
	ID   int64  // 团队主键
	Name string // 团队名称
}

// Item 是平台用户投影。
type Item struct {
	ID          int64     // 主键
	Username    string    // 登录账号
	Nickname    string    // 显示名称
	Email       string    // 邮箱
	Department  string    // 部门
	Title       string    // 职位
	RoleCode    role.Code // 角色编码
	RoleName    string    // 角色显示名
	Teams       []TeamRef // 所属团队
	Enabled     bool      // 是否启用
	LastLoginAt int64     // 最近登录时间
	CreatedAt   int64     // 创建时间
}

// ListInput 是列表查询条件。
type ListInput struct {
	PageNum  int    // 页码，从 1 开始
	PageSize int    // 每页条数
	Keyword  string // 账号或姓名关键词
	RoleCode string // 角色编码筛选
	Enabled  *bool  // 启停筛选，nil 表示全部
}

// ListOutput 是分页列表结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 筛选后总数
}

// Service 暴露平台用户管理操作。
type Service interface {
	// List 返回从 LDAP 加入的平台用户。筛选、排序与分页在装配当前页之前于数据库侧完成。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// AddFromDirectory 按账号从 LDAP 批量加入平台用户。已存在的账号会被跳过。
	AddFromDirectory(ctx context.Context, usernames []string, roleCode role.Code) (int, error)
	// UpdateStatus 批量启用或停用。已是目标状态的用户会被跳过。
	UpdateStatus(ctx context.Context, ids []int64, enabled bool) (int, error)
	// UpdateRole 批量为用户指定内置角色。
	UpdateRole(ctx context.Context, ids []int64, roleCode role.Code) (int, error)
	// Remove 软删除用户并解除团队成员关系。不得移除 actorID。
	Remove(ctx context.Context, ids []int64, actorID int64) (int, error)
	// ExistingUsernames 批量判断账号是否已在平台用户列表中。
	ExistingUsernames(ctx context.Context, usernames []string) (map[string]bool, error)
	// GetEnabled 返回启用中的平台 LDAP 用户。不存在或停用时返回 CodeNotFound。
	GetEnabled(ctx context.Context, id int64) (*Item, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	ldapSvc ldap.Service // 目录服务
	roleSvc role.Service // 角色服务
}

// New 构造用户服务。ldapSvc 与 roleSvc 不得为空。
func New(ldapSvc ldap.Service, roleSvc role.Service) (Service, error) {
	if ldapSvc == nil {
		return nil, gerror.New("ldap service is required")
	}
	if roleSvc == nil {
		return nil, gerror.New("role service is required")
	}
	return &serviceImpl{ldapSvc: ldapSvc, roleSvc: roleSvc}, nil
}

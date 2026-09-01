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

// NameRef 是团队名称投影。
type NameRef struct {
	ID   int64  // 主键
	Name string // 名称
}

// QueueRef 是已关联队列投影。
type QueueRef struct {
	ID                  int64  // 队列 ID
	Name                string // 标识
	DisplayName         string // 显示名
	DatacenterCode      string // 数据中心标识
	DatacenterName      string // 数据中心名称
	DatacenterShortName string // 数据中心简称
	DatacenterColor     string // 数据中心颜色
	GPUType             string // 卡型号
	Enabled             bool   // 是否启用
	State               string // Volcano 状态
}

// QueueOption 是管理队列弹窗候选项。
type QueueOption struct {
	ID                  int64  // 队列 ID
	Name                string // 标识
	DisplayName         string // 显示名
	DatacenterCode      string // 数据中心标识
	DatacenterName      string // 数据中心名称
	DatacenterShortName string // 数据中心简称
	DatacenterColor     string // 数据中心颜色
	GPUType             string // 卡型号
	GPUQuota            int    // GPU 额度
	GPUUsed             int    // GPU 已用
	Enabled             bool   // 是否启用
	State               string // Volcano 状态
}

// QueueSource 按团队批量返回关联队列，并承接团队侧绑定写入。
type QueueSource interface {
	// ListByTeamIDs 按团队批量返回关联队列。无关联时对应值为空切片。
	ListByTeamIDs(ctx context.Context, teamIDs []int64) (map[int64][]QueueRef, error)
	// ListBindOptions 分页返回可供绑定的队列。keyword 空表示不过滤。
	ListBindOptions(ctx context.Context, keyword string, pageNum, pageSize int) ([]QueueOption, int, error)
	// ReplaceQueuesForTeam 按队列 ID 全量替换该团队绑定。空切片解除全部绑定。
	ReplaceQueuesForTeam(ctx context.Context, teamID int64, queueIDs []int64) error
}

// Detail 是团队详情。
type Detail struct {
	Item                 // 列表投影
	Members   []Member   // 成员列表
	Queues    []QueueRef // 关联队列
	UpdatedAt int64      // 更新时间
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
	// MapByIDs 按 ID 批量返回团队名称，缺失键不出现。
	MapByIDs(ctx context.Context, ids []int64) (map[int64]NameRef, error)
	// ListIDsByUserID 返回用户加入的团队 ID，无成员关系时返回空切片。
	ListIDsByUserID(ctx context.Context, userID int64) ([]int64, error)
	// ListNameRefsByUserID 返回用户加入的团队名称投影。
	ListNameRefsByUserID(ctx context.Context, userID int64) ([]NameRef, error)
	// BindQueues 注入队列投影，供详情展示关联队列。
	BindQueues(queues QueueSource)
	// ListQueueOptions 返回可供绑定的队列候选项。队列模块未装配时返回空列表。
	ListQueueOptions(ctx context.Context, keyword string, pageNum, pageSize int) ([]QueueOption, int, error)
	// SetQueues 全量替换团队关联队列。queueIDs 为空表示解绑全部。队列模块未装配时返回校验错误。
	SetQueues(ctx context.Context, teamID int64, queueIDs []int64) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	userSvc user.Service // 用户服务
	queues  QueueSource  // 可选队列投影
}

// New 构造团队服务。userSvc 不得为空。
func New(userSvc user.Service) (Service, error) {
	if userSvc == nil {
		return nil, gerror.New("user service is required")
	}
	return &serviceImpl{userSvc: userSvc}, nil
}

// BindQueues 注入队列投影来源。
func (s *serviceImpl) BindQueues(queues QueueSource) {
	s.queues = queues
}

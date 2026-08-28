// Package traincfg 管理训练配置集、个人草稿与不可变版本。
package traincfg

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/team"
)

const (
	maxListSize    = 100
	defaultListNum = 1
	defaultPageSz  = 10
	maxFileBytes   = 50 * 1024
	maxFiles       = 40
	maxFilePath    = 128
)

// Actor 是当前会话身份。
type Actor struct {
	UserID   int64  // 用户 ID
	Username string // 账号
	Nickname string // 显示名
	IsAdmin  bool   // 是否管理员
}

// File 是配置文件。
type File struct {
	Path    string // 相对路径
	Content string // 内容
}

// Draft 是个人草稿。
type Draft struct {
	OwnerUsername string // 所有人账号
	OwnerNickname string // 所有人显示名
	Message       string // 拟发布说明
	Files         []File // 文件
	UpdatedAt     int64  // 更新时间
}

// Version 是已发布版本。
type Version struct {
	Version        int    // 版本号
	Message        string // 说明
	AuthorUsername string // 发布人账号
	AuthorNickname string // 发布人显示名
	Digest         string // 摘要
	FileCount      int    // 文件数
	Files          []File // 文件，列表为空
	CreatedAt      int64  // 发布时间
}

// Item 是配置集投影。
type Item struct {
	ID             int64     // 主键
	Name           string    // 标识
	DisplayName    string    // 显示名
	TeamID         int64     // 团队
	TeamName       string    // 团队名
	Framework      string    // 框架
	Visibility     string    // 可见性
	Status         string    // 状态
	Description    string    // 描述
	LatestVersion  int       // 最新版本
	LatestMessage  string    // 最新版本说明
	FileCount      int       // 文件数
	OwnerUsername  string    // 创建人账号
	OwnerNickname  string    // 创建人显示名
	HasDraft       bool      // 当前用户草稿
	DraftUpdatedAt int64     // 草稿时间
	Draft          *Draft    // 草稿详情
	Files          []File    // 最新版文件
	Versions       []Version // 版本历史
	CreatedAt      int64     // 创建
	UpdatedAt      int64     // 更新
}

// ListInput 是列表条件。
type ListInput struct {
	Actor     Actor  // 调用方
	PageNum   int    // 页码
	PageSize  int    // 每页
	Keyword   string // 关键词
	TeamID    int64  // 团队
	Scope     string // 范围
	Status    string // 状态
	Framework string // 框架
}

// ListOutput 是分页结果。
type ListOutput struct {
	List  []*Item // 当前页
	Total int     // 总数
}

// WriteInput 是创建或保存草稿的元数据与文件。
type WriteInput struct {
	Actor       Actor  // 调用方
	DisplayName string // 显示名
	TeamID      int64  // 团队
	Framework   string // 框架
	Visibility  string // 可见性
	Description string // 描述
	Message     string // 版本说明
	Files       []File // 文件
	BaseVersion int    // 发布时基于的版本
}

// Service 定义配置集操作。
type Service interface {
	// List 按可见性过滤并分页。
	List(ctx context.Context, in ListInput) (*ListOutput, error)
	// Get 返回详情、最新文件、当前用户草稿与版本历史。
	Get(ctx context.Context, actor Actor, id int64) (*Item, error)
	// GetVersion 返回指定不可变版本文件。
	GetVersion(ctx context.Context, actor Actor, id int64, version int) (*Version, error)
	// Create 创建配置集，可选写入草稿。
	Create(ctx context.Context, in WriteInput) (int64, error)
	// SaveDraft 保存个人草稿。
	SaveDraft(ctx context.Context, id int64, in WriteInput) error
	// Publish 发布新版本并清除草稿。
	Publish(ctx context.Context, id int64, in WriteInput) (int, error)
	// UpdateStatus 归档或恢复。
	UpdateStatus(ctx context.Context, actor Actor, id int64, status string) error
	// Snapshot 读取已发布版本文件供任务挂载，调用方须已通过可见性校验或与任务同团队。
	Snapshot(ctx context.Context, setID int64, version int) (*Item, []File, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	teamSvc team.Service // 团队
}

// New 构造配置集服务。
func New(teamSvc team.Service) (Service, error) {
	if teamSvc == nil {
		return nil, gerror.New("team service is required")
	}
	return &serviceImpl{teamSvc: teamSvc}, nil
}

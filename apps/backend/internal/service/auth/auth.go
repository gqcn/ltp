// Package auth 实现本地管理员与 LDAP 用户登录及服务端会话。
package auth

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
)

const (
	defaultSessionTTL = 24 * time.Hour
	adminRoleName     = "平台管理员"
)

// User 是已认证账号的对外身份。
type User struct {
	ID         int64      // 用户主键
	Username   string     // 登录账号
	Nickname   string     // 显示名称
	Email      string     // 邮箱
	Department string     // 部门
	Title      string     // 职位
	Source     UserSource // 账号来源
	RoleCode   role.Code  // 角色编码
	RoleName   string     // 角色显示名
	Menus      []string   // 可见菜单分区
	IsAdmin    bool       // 是否平台管理员
}

// LoginInput 是创建会话的命令。
type LoginInput struct {
	Mode      LoginMode // 登录入口
	Username  string    // 登录账号
	Password  string    // 明文口令
	UserAgent string    // 客户端 UA
	IPAddress string    // 客户端 IP
}

// LoginResult 包含对外用户信息以及不进入 JSON 的 Cookie 材料。
type LoginResult struct {
	User      User      // 已认证用户
	Token     string    // 会话令牌
	ExpiresAt time.Time // Cookie 过期时间
}

// Config 是认证服务的纯值配置。
type Config struct {
	SessionTTL time.Duration // 会话有效期
}

// Service 暴露认证相关操作。
type Service interface {
	// Login 按登录方式校验凭据，创建服务端会话，并返回 HTTP 层必须写入 HttpOnly Cookie 的不透明令牌。
	Login(ctx context.Context, in LoginInput) (LoginResult, error)
	// CurrentSession 将不透明会话令牌解析为已登录用户。缺失、过期或已撤销的令牌返回 CodeUnauthorized。
	CurrentSession(ctx context.Context, token string) (User, error)
	// Logout 撤销不透明会话令牌。缺失令牌视为已退出，保证退出操作幂等。
	Logout(ctx context.Context, token string) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	sessionTTL time.Duration // 会话有效期
	ldapSvc    ldap.Service  // 目录服务
	roleSvc    role.Service  // 角色服务
}

// New 构造认证服务。ldapSvc 与 roleSvc 不得为空。
func New(config Config, ldapSvc ldap.Service, roleSvc role.Service) (Service, error) {
	if ldapSvc == nil {
		return nil, gerror.New("ldap service is required")
	}
	if roleSvc == nil {
		return nil, gerror.New("role service is required")
	}
	sessionTTL := config.SessionTTL
	if sessionTTL == 0 {
		sessionTTL = defaultSessionTTL
	}
	if sessionTTL < time.Minute {
		return nil, gerror.New("auth session ttl must be at least one minute")
	}
	return &serviceImpl{
		sessionTTL: sessionTTL,
		ldapSvc:    ldapSvc,
		roleSvc:    roleSvc,
	}, nil
}

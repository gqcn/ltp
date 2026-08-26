// Package auth 实现本地管理员登录与服务端会话。
package auth

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
)

const defaultSessionTTL = 24 * time.Hour

// User 是已认证账号的对外身份。
type User struct {
	ID       int64
	Username string
	Nickname string
}

// LoginResult 包含对外用户信息以及不进入 JSON 的 Cookie 材料。
type LoginResult struct {
	User      User
	Token     string
	ExpiresAt time.Time
}

// Config 是认证服务的纯值配置。
type Config struct {
	SessionTTL time.Duration
}

// Service 暴露认证相关操作。
type Service interface {
	// Login 校验账号密码，创建服务端会话，并返回 HTTP 层必须写入 HttpOnly Cookie 的不透明令牌。
	Login(ctx context.Context, username string, password string, userAgent string, ipAddress string) (LoginResult, error)
	// CurrentSession 将不透明会话令牌解析为已登录用户。缺失、过期或已撤销的令牌返回 CodeUnauthorized。
	CurrentSession(ctx context.Context, token string) (User, error)
	// Logout 撤销不透明会话令牌。缺失令牌视为已退出，保证退出操作幂等。
	Logout(ctx context.Context, token string) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	sessionTTL time.Duration
}

// New 构造认证服务。
func New(config Config) (Service, error) {
	sessionTTL := config.SessionTTL
	if sessionTTL == 0 {
		sessionTTL = defaultSessionTTL
	}
	if sessionTTL < time.Minute {
		return nil, gerror.New("auth session ttl must be at least one minute")
	}
	return &serviceImpl{sessionTTL: sessionTTL}, nil
}

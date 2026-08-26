// 本文件实现凭据校验与服务端会话生命周期。

package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"
	"golang.org/x/crypto/bcrypt"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

const sessionTokenBytes = 32

// Login 校验凭据并创建新的服务端会话。
func (s *serviceImpl) Login(ctx context.Context, username string, password string, userAgent string, ipAddress string) (LoginResult, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return LoginResult{}, bizerr.New(CodeInvalidCredentials)
	}
	var user *entity.SysUser
	err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Username: username}).Scan(&user)
	if err != nil {
		return LoginResult{}, gerror.Wrap(err, "query user")
	}
	if user == nil {
		return LoginResult{}, bizerr.New(CodeInvalidCredentials)
	}
	if UserStatus(user.Status) != UserStatusEnabled {
		return LoginResult{}, bizerr.New(CodeUserDisabled)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return LoginResult{}, bizerr.New(CodeInvalidCredentials)
	}
	token, err := generateSessionToken()
	if err != nil {
		return LoginResult{}, err
	}
	expiresAt := time.Now().Add(s.sessionTTL)
	if _, err := dao.SysUserSession.Ctx(ctx).Data(do.SysUserSession{
		UserId:    user.Id,
		TokenHash: sessionTokenHash(token),
		UserAgent: clip(userAgent, 512),
		IpAddress: clip(ipAddress, 64),
		ExpiresAt: gtime.New(expiresAt),
	}).Insert(); err != nil {
		return LoginResult{}, gerror.Wrap(err, "create session")
	}
	logger.Infof(ctx, "user %s signed in", user.Username)
	return LoginResult{
		User: User{
			ID:       user.Id,
			Username: user.Username,
			Nickname: user.Nickname,
		},
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}

// CurrentSession 解析当前已认证会话令牌。
func (s *serviceImpl) CurrentSession(ctx context.Context, token string) (User, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return User{}, bizerr.New(CodeUnauthorized)
	}
	var session *entity.SysUserSession
	err := dao.SysUserSession.Ctx(ctx).Where(do.SysUserSession{
		TokenHash: sessionTokenHash(token),
	}).Scan(&session)
	if err != nil {
		return User{}, gerror.Wrap(err, "query session")
	}
	if session == nil || session.RevokedAt != nil && !session.RevokedAt.IsZero() {
		return User{}, bizerr.New(CodeUnauthorized)
	}
	if session.ExpiresAt == nil || session.ExpiresAt.Before(gtime.Now()) {
		return User{}, bizerr.New(CodeUnauthorized)
	}
	var user *entity.SysUser
	err = dao.SysUser.Ctx(ctx).Where(do.SysUser{Id: session.UserId}).Scan(&user)
	if err != nil {
		return User{}, gerror.Wrap(err, "query session user")
	}
	if user == nil || UserStatus(user.Status) != UserStatusEnabled {
		return User{}, bizerr.New(CodeUnauthorized)
	}
	return User{ID: user.Id, Username: user.Username, Nickname: user.Nickname}, nil
}

// Logout 撤销当前会话令牌。
func (s *serviceImpl) Logout(ctx context.Context, token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil
	}
	_, err := dao.SysUserSession.Ctx(ctx).Where(do.SysUserSession{
		TokenHash: sessionTokenHash(token),
	}).Data(do.SysUserSession{
		RevokedAt: gtime.Now(),
	}).Update()
	if err != nil {
		return gerror.Wrap(err, "revoke session")
	}
	return nil
}

func generateSessionToken() (string, error) {
	buf := make([]byte, sessionTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", gerror.Wrap(err, "generate session token")
	}
	return hex.EncodeToString(buf), nil
}

func sessionTokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func clip(v string, limit int) string {
	if len(v) <= limit {
		return v
	}
	return v[:limit]
}

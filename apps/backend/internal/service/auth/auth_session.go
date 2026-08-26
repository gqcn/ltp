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
	"github.com/gqcn/ltp/internal/service/role"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

const sessionTokenBytes = 32

// Login 按登录方式校验凭据并创建新的服务端会话。
func (s *serviceImpl) Login(ctx context.Context, in LoginInput) (LoginResult, error) {
	mode, ok := ParseLoginMode(string(in.Mode))
	if !ok {
		return LoginResult{}, bizerr.New(CodeInvalidCredentials, bizerr.P("message", "请选择登录方式"))
	}
	username := normalizeLoginName(in.Username)
	password := in.Password
	if username == "" || password == "" {
		if mode == LoginModeAdmin {
			return LoginResult{}, bizerr.New(CodeInvalidCredentials, bizerr.P("message", "请输入平台管理员账号和密码"))
		}
		return LoginResult{}, bizerr.New(CodeInvalidCredentials, bizerr.P("message", "请输入域账号和密码"))
	}
	var row *entity.SysUser
	err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Username: username}).Scan(&row)
	if err != nil {
		return LoginResult{}, gerror.Wrap(err, "query user")
	}
	if mode == LoginModeAdmin {
		if err := s.verifyAdmin(row, password); err != nil {
			return LoginResult{}, err
		}
	} else {
		if err := s.verifyLDAP(ctx, row, username, password); err != nil {
			return LoginResult{}, err
		}
	}
	token, err := generateSessionToken()
	if err != nil {
		return LoginResult{}, err
	}
	expiresAt := time.Now().Add(s.sessionTTL)
	if _, err := dao.SysUserSession.Ctx(ctx).Data(do.SysUserSession{
		UserId:    row.Id,
		TokenHash: sessionTokenHash(token),
		UserAgent: clip(in.UserAgent, 512),
		IpAddress: clip(in.IPAddress, 64),
		ExpiresAt: gtime.New(expiresAt),
	}).Insert(); err != nil {
		return LoginResult{}, gerror.Wrap(err, "create session")
	}
	if _, err := dao.SysUser.Ctx(ctx).Where(do.SysUser{Id: row.Id}).Data(do.SysUser{
		LastLoginAt: gtime.Now(),
	}).Update(); err != nil {
		return LoginResult{}, gerror.Wrap(err, "touch last login")
	}
	identity, err := s.projectUser(ctx, row)
	if err != nil {
		return LoginResult{}, err
	}
	logger.Infof(ctx, "user %s signed in via %s", row.Username, mode)
	return LoginResult{User: identity, Token: token, ExpiresAt: expiresAt}, nil
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
	return s.projectUser(ctx, user)
}

func (s *serviceImpl) verifyAdmin(row *entity.SysUser, password string) error {
	if row == nil || parseUserSource(row.Source) != UserSourceLocal {
		return bizerr.New(CodeInvalidCredentials, bizerr.P("message", "平台管理员账号或密码错误"))
	}
	if UserStatus(row.Status) != UserStatusEnabled {
		return bizerr.New(CodeUserDisabled)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(row.Password), []byte(password)); err != nil {
		return bizerr.New(CodeInvalidCredentials, bizerr.P("message", "平台管理员账号或密码错误"))
	}
	return nil
}

func (s *serviceImpl) verifyLDAP(ctx context.Context, row *entity.SysUser, username string, password string) error {
	if row == nil || parseUserSource(row.Source) != UserSourceLDAP {
		return bizerr.New(CodeNotPlatformUser)
	}
	if UserStatus(row.Status) != UserStatusEnabled {
		return bizerr.New(CodeUserDisabled)
	}
	if err := s.ldapSvc.BindUser(ctx, username, password); err != nil {
		return bizerr.New(CodeInvalidCredentials, bizerr.P("message", "域账号或密码错误"))
	}
	return nil
}

func (s *serviceImpl) projectUser(ctx context.Context, row *entity.SysUser) (User, error) {
	source := parseUserSource(row.Source)
	out := User{
		ID:         row.Id,
		Username:   row.Username,
		Nickname:   row.Nickname,
		Email:      row.Email,
		Department: row.Department,
		Title:      row.Title,
		Source:     source,
		IsAdmin:    source == UserSourceLocal,
	}
	if out.IsAdmin {
		out.RoleName = adminRoleName
		out.Menus = role.AllMenus()
		return out, nil
	}
	code, ok := role.ParseCode(row.RoleCode)
	if !ok {
		return out, nil
	}
	item, err := s.roleSvc.GetByCode(ctx, code)
	if err != nil {
		return User{}, err
	}
	out.RoleCode = item.Code
	out.RoleName = item.Name
	out.Menus = append([]string{}, item.Menus...)
	return out, nil
}

func normalizeLoginName(raw string) string {
	name := strings.ToLower(strings.TrimSpace(raw))
	if i := strings.Index(name, "@"); i > 0 {
		name = name[:i]
	}
	return name
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

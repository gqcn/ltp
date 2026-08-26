// 本文件将认证服务投影映射为公开 API DTO。

package auth

import (
	v1 "github.com/gqcn/ltp/api/auth/v1"
	authsvc "github.com/gqcn/ltp/internal/service/auth"
)

func toSessionUser(user authsvc.User) v1.SessionUser {
	menus := user.Menus
	if menus == nil {
		menus = []string{}
	}
	return v1.SessionUser{
		Id:         user.ID,
		Username:   user.Username,
		Nickname:   user.Nickname,
		Email:      user.Email,
		Department: user.Department,
		Title:      user.Title,
		Source:     string(user.Source),
		RoleCode:   string(user.RoleCode),
		RoleName:   user.RoleName,
		Menus:      menus,
		IsAdmin:    user.IsAdmin,
	}
}

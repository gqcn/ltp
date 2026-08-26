// 本文件将用户服务投影映射为公开 API DTO。

package user

import (
	v1 "github.com/gqcn/ltp/api/user/v1"
	usersvc "github.com/gqcn/ltp/internal/service/user"
)

func toListItem(item *usersvc.Item) *v1.ListItem {
	if item == nil {
		return nil
	}
	teams := make([]v1.TeamRef, 0, len(item.Teams))
	for _, team := range item.Teams {
		teams = append(teams, v1.TeamRef{Id: team.ID, Name: team.Name})
	}
	return &v1.ListItem{
		Id:          item.ID,
		Username:    item.Username,
		Nickname:    item.Nickname,
		Email:       item.Email,
		Department:  item.Department,
		Title:       item.Title,
		RoleCode:    string(item.RoleCode),
		RoleName:    item.RoleName,
		Teams:       teams,
		Enabled:     item.Enabled,
		LastLoginAt: item.LastLoginAt,
		CreatedAt:   item.CreatedAt,
	}
}

// 本文件将团队服务投影映射为公开 API DTO。

package team

import (
	v1 "github.com/gqcn/ltp/api/team/v1"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
)

func toOwner(owner teamsvc.Owner) v1.OwnerRef {
	return v1.OwnerRef{Id: owner.ID, Username: owner.Username, Nickname: owner.Nickname}
}

func toListItem(item *teamsvc.Item) *v1.ListItem {
	if item == nil {
		return nil
	}
	return &v1.ListItem{
		Id:          item.ID,
		Name:        item.Name,
		Description: item.Description,
		Owner:       toOwner(item.Owner),
		MemberCount: item.MemberCount,
		CreatedAt:   item.CreatedAt,
	}
}

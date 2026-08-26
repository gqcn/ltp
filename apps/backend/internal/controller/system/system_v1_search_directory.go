// 本文件检索 LDAP 目录用户。

package system

import (
	"context"

	v1 "github.com/gqcn/ltp/api/system/v1"
)

// SearchDirectory 按关键词检索 LDAP 目录。
func (c *ControllerV1) SearchDirectory(ctx context.Context, req *v1.SearchDirectoryReq) (res *v1.SearchDirectoryRes, err error) {
	entries, err := c.ldapSvc.SearchDirectory(ctx, req.Keyword)
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(entries))
	for _, item := range entries {
		names = append(names, item.Username)
	}
	added, err := c.userSvc.ExistingUsernames(ctx, names)
	if err != nil {
		return nil, err
	}
	list := make([]*v1.DirectoryUser, 0, len(entries))
	for _, item := range entries {
		list = append(list, &v1.DirectoryUser{
			Username:     item.Username,
			Name:         item.Name,
			Email:        item.Email,
			Department:   item.Department,
			Title:        item.Title,
			AlreadyAdded: added[item.Username],
		})
	}
	return &v1.SearchDirectoryRes{List: list}, nil
}

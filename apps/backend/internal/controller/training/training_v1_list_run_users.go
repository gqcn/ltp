// 本文件实现训练任务运行用户检索。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/user"
)

// ListRunUsers 检索 LDAP 运行用户。
func (c *ControllerV1) ListRunUsers(ctx context.Context, req *v1.ListRunUsersReq) (*v1.ListRunUsersRes, error) {
	enabled := true
	out, err := c.userSvc.List(ctx, user.ListInput{
		PageNum:  req.PageNum,
		PageSize: req.PageSize,
		Keyword:  req.Keyword,
		Enabled:  &enabled,
	})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.RunUserItem, 0, len(out.List))
	for _, item := range out.List {
		if item == nil {
			continue
		}
		list = append(list, &v1.RunUserItem{
			Id:         item.ID,
			Username:   item.Username,
			Nickname:   item.Nickname,
			Email:      item.Email,
			Department: item.Department,
		})
	}
	return &v1.ListRunUsersRes{List: list, Total: out.Total}, nil
}

// 本文件实现团队详情处理。

package team

import (
	"context"

	v1 "github.com/gqcn/ltp/api/team/v1"
)

// Get 返回团队详情与成员。
func (c *ControllerV1) Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error) {
	out, err := c.teamSvc.Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	members := make([]v1.MemberItem, 0, len(out.Members))
	for _, member := range out.Members {
		members = append(members, v1.MemberItem{
			Id:         member.ID,
			Username:   member.Username,
			Nickname:   member.Nickname,
			Email:      member.Email,
			Department: member.Department,
		})
	}
	return &v1.GetRes{
		Id:          out.ID,
		Name:        out.Name,
		Description: out.Description,
		Owner:       toOwner(out.Owner),
		Members:     members,
		CreatedAt:   out.CreatedAt,
		UpdatedAt:   out.UpdatedAt,
	}, nil
}

// 本文件实现训练中心可选团队列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/team"
)

// ListTeams 返回可选团队。
func (c *ControllerV1) ListTeams(ctx context.Context, _ *v1.ListTeamsReq) (*v1.ListTeamsRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	var refs []struct {
		id   int64
		name string
	}
	if actor.IsAdmin {
		out, err := c.teamSvc.List(ctx, team.ListInput{PageNum: 1, PageSize: 100})
		if err != nil {
			return nil, err
		}
		for _, item := range out.List {
			if item != nil {
				refs = append(refs, struct {
					id   int64
					name string
				}{item.ID, item.Name})
			}
		}
	} else {
		names, err := c.teamSvc.ListNameRefsByUserID(ctx, actor.UserID)
		if err != nil {
			return nil, err
		}
		for _, n := range names {
			refs = append(refs, struct {
				id   int64
				name string
			}{n.ID, n.Name})
		}
	}
	list := make([]*v1.TeamItem, 0, len(refs))
	for _, r := range refs {
		list = append(list, &v1.TeamItem{Id: r.id, Name: r.name})
	}
	return &v1.ListTeamsRes{List: list}, nil
}

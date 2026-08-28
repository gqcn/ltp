// 本文件实现配置集列表。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

// ListConfigs 返回分页配置集。
func (c *ControllerV1) ListConfigs(ctx context.Context, req *v1.ListConfigsReq) (*v1.ListConfigsRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.cfgSvc.List(ctx, traincfg.ListInput{
		Actor:     actor,
		PageNum:   req.PageNum,
		PageSize:  req.PageSize,
		Keyword:   req.Keyword,
		TeamID:    req.TeamId,
		Scope:     req.Scope,
		Status:    req.Status,
		Framework: req.Framework,
	})
	if err != nil {
		return nil, err
	}
	list := make([]*v1.ConfigListItem, 0, len(out.List))
	for _, item := range out.List {
		list = append(list, toConfigListItem(item))
	}
	return &v1.ListConfigsRes{List: list, Total: out.Total}, nil
}

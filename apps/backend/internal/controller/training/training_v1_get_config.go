// 本文件实现配置集详情。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

// GetConfig 返回配置集详情。
func (c *ControllerV1) GetConfig(ctx context.Context, req *v1.GetConfigReq) (*v1.GetConfigRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	item, err := c.cfgSvc.Get(ctx, actor, req.Id)
	if err != nil {
		return nil, err
	}
	res := &v1.GetConfigRes{
		ConfigListItem: *toConfigListItem(item),
		Description:    item.Description,
		Files:          toConfigFiles(item.Files),
		Versions:       toVersionSummaries(item.Versions),
	}
	if item.Draft != nil {
		res.Draft = &v1.ConfigDraft{
			OwnerUsername: item.Draft.OwnerUsername,
			OwnerNickname: item.Draft.OwnerNickname,
			Message:       item.Draft.Message,
			Files:         toConfigFiles(item.Draft.Files),
			UpdatedAt:     item.Draft.UpdatedAt,
		}
	}
	return res, nil
}

func toVersionSummaries(in []traincfg.Version) []v1.ConfigVersionSummary {
	out := make([]v1.ConfigVersionSummary, 0, len(in))
	for _, v := range in {
		out = append(out, v1.ConfigVersionSummary{
			Version:        v.Version,
			Message:        v.Message,
			AuthorUsername: v.AuthorUsername,
			AuthorNickname: v.AuthorNickname,
			Digest:         v.Digest,
			FileCount:      v.FileCount,
			CreatedAt:      v.CreatedAt,
		})
	}
	return out
}

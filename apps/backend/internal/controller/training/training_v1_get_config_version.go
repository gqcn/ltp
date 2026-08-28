// 本文件实现读取配置历史版本。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// GetConfigVersion 读取历史版本。
func (c *ControllerV1) GetConfigVersion(ctx context.Context, req *v1.GetConfigVersionReq) (*v1.GetConfigVersionRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	ver, err := c.cfgSvc.GetVersion(ctx, actor, req.Id, req.Version)
	if err != nil {
		return nil, err
	}
	return &v1.GetConfigVersionRes{
		ConfigVersionSummary: v1.ConfigVersionSummary{
			Version:        ver.Version,
			Message:        ver.Message,
			AuthorUsername: ver.AuthorUsername,
			AuthorNickname: ver.AuthorNickname,
			Digest:         ver.Digest,
			FileCount:      ver.FileCount,
			CreatedAt:      ver.CreatedAt,
		},
		Files: toConfigFiles(ver.Files),
	}, nil
}

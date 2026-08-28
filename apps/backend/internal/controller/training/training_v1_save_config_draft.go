// 本文件实现保存配置草稿。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

// SaveConfigDraft 保存草稿。
func (c *ControllerV1) SaveConfigDraft(ctx context.Context, req *v1.SaveConfigDraftReq) (*v1.SaveConfigDraftRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.cfgSvc.SaveDraft(ctx, req.Id, traincfg.WriteInput{
		Actor:       actor,
		DisplayName: req.DisplayName,
		Framework:   req.Framework,
		Visibility:  req.Visibility,
		Description: req.Description,
		Message:     req.Message,
		Files:       fromConfigFiles(req.Files),
	}); err != nil {
		return nil, err
	}
	return &v1.SaveConfigDraftRes{}, nil
}

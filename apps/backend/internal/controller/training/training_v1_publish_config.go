// 本文件实现发布配置版本。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

// PublishConfig 发布版本。
func (c *ControllerV1) PublishConfig(ctx context.Context, req *v1.PublishConfigReq) (*v1.PublishConfigRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	ver, err := c.cfgSvc.Publish(ctx, req.Id, traincfg.WriteInput{
		Actor:       actor,
		DisplayName: req.DisplayName,
		Framework:   req.Framework,
		Visibility:  req.Visibility,
		Description: req.Description,
		Message:     req.Message,
		Files:       fromConfigFiles(req.Files),
		BaseVersion: req.BaseVersion,
	})
	if err != nil {
		return nil, err
	}
	return &v1.PublishConfigRes{Version: ver}, nil
}

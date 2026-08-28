// 本文件实现创建配置集。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

// CreateConfig 创建配置集。
func (c *ControllerV1) CreateConfig(ctx context.Context, req *v1.CreateConfigReq) (*v1.CreateConfigRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	id, err := c.cfgSvc.Create(ctx, traincfg.WriteInput{
		Actor:       actor,
		DisplayName: req.DisplayName,
		TeamID:      req.TeamId,
		Framework:   req.Framework,
		Visibility:  req.Visibility,
		Description: req.Description,
		Message:     req.Message,
		Files:       fromConfigFiles(req.Files),
	})
	if err != nil {
		return nil, err
	}
	return &v1.CreateConfigRes{Id: id}, nil
}

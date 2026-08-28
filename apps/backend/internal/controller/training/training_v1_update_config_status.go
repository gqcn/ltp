// 本文件实现归档或恢复配置集。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// UpdateConfigStatus 归档或恢复。
func (c *ControllerV1) UpdateConfigStatus(ctx context.Context, req *v1.UpdateConfigStatusReq) (*v1.UpdateConfigStatusRes, error) {
	actor, err := c.cfgActor(ctx)
	if err != nil {
		return nil, err
	}
	if err := c.cfgSvc.UpdateStatus(ctx, actor, req.Id, req.Status); err != nil {
		return nil, err
	}
	return &v1.UpdateConfigStatusRes{}, nil
}

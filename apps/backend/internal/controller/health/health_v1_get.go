// 本文件实现存活检查处理。

package health

import (
	"context"

	v1 "github.com/gqcn/ltp/api/health/v1"
)

// Get 返回进程存活状态。
func (c *ControllerV1) Get(_ context.Context, _ *v1.GetReq) (res *v1.GetRes, err error) {
	return &v1.GetRes{Status: "ok"}, nil
}

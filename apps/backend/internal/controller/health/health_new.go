// 本文件定义健康检查控制器构造函数。

package health

import "github.com/gqcn/ltp/api/health"

// ControllerV1 是健康检查控制器。
type ControllerV1 struct{}

// NewV1 创建健康检查控制器。
func NewV1() health.IHealthV1 {
	return &ControllerV1{}
}

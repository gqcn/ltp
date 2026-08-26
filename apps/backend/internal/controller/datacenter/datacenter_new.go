// 本文件定义数据中心控制器构造函数与注入依赖。

package datacenter

import (
	dcapi "github.com/gqcn/ltp/api/datacenter"
	dcsvc "github.com/gqcn/ltp/internal/service/datacenter"
)

// ControllerV1 是数据中心控制器。
type ControllerV1 struct {
	dcSvc dcsvc.Service
}

// NewV1 创建数据中心控制器。
func NewV1(dcSvc dcsvc.Service) dcapi.IDatacenterV1 {
	return &ControllerV1{dcSvc: dcSvc}
}

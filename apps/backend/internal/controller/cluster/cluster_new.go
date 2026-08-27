// 本文件定义集群控制器构造函数与注入依赖。

package cluster

import (
	clusterapi "github.com/gqcn/ltp/api/cluster"
	clustersvc "github.com/gqcn/ltp/internal/service/cluster"
)

// ControllerV1 是集群控制器。
type ControllerV1 struct {
	clusterSvc clustersvc.Service
}

// NewV1 创建集群控制器。
func NewV1(clusterSvc clustersvc.Service) clusterapi.IClusterV1 {
	return &ControllerV1{clusterSvc: clusterSvc}
}

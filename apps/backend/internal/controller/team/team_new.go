// 本文件定义团队控制器构造函数与注入依赖。

package team

import (
	teamapi "github.com/gqcn/ltp/api/team"
	teamsvc "github.com/gqcn/ltp/internal/service/team"
)

// ControllerV1 是团队控制器。
type ControllerV1 struct {
	teamSvc teamsvc.Service
}

// NewV1 创建团队控制器。
func NewV1(teamSvc teamsvc.Service) teamapi.ITeamV1 {
	return &ControllerV1{teamSvc: teamSvc}
}

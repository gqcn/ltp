// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// ExpRun is the golang structure for table exp_run.
type ExpRun struct {
	Id               int64       `json:"id"               orm:"id"                  description:"Run ID"`
	Name             string      `json:"name"             orm:"name"                description:"Run 名称，默认与任务名相同"`
	ProjectId        int64       `json:"projectId"        orm:"project_id"          description:"所属项目 ID"`
	ClusterId        int64       `json:"clusterId"        orm:"cluster_id"          description:"工作集群 ID"`
	TeamId           int64       `json:"teamId"           orm:"team_id"             description:"所属团队 ID"`
	TeamName         string      `json:"teamName"         orm:"team_name"           description:"团队名称快照"`
	JobId            int64       `json:"jobId"            orm:"job_id"              description:"关联训练任务 ID"`
	TbLogdir         string      `json:"tbLogdir"         orm:"tb_logdir"           description:"TensorBoard logdir"`
	DatacenterCode   string      `json:"datacenterCode"   orm:"datacenter_code"     description:"任务机房标识"`
	OwnerUserId      int64       `json:"ownerUserId"      orm:"owner_user_id"       description:"创建人 ID"`
	OwnerUsername    string      `json:"ownerUsername"    orm:"owner_username"      description:"创建人账号"`
	OwnerNickname    string      `json:"ownerNickname"    orm:"owner_nickname"      description:"创建人显示名"`
	LastLoss         float64     `json:"lastLoss"         orm:"last_loss"           description:"最新 train loss"`
	LastStep         int64       `json:"lastStep"         orm:"last_step"           description:"最新 step"`
	MaxSteps         int64       `json:"maxSteps"         orm:"max_steps"           description:"进度分母，可空"`
	LastTokensPerSec float64     `json:"lastTokensPerSec" orm:"last_tokens_per_sec" description:"最新吞吐标量"`
	MetricsAt        *gtime.Time `json:"metricsAt"        orm:"metrics_at"          description:"最近一次成功读盘时间"`
	MetricsError     string      `json:"metricsError"     orm:"metrics_error"       description:"最近一次读盘失败说明"`
	BoardAccessedAt  *gtime.Time `json:"boardAccessedAt"  orm:"board_accessed_at"   description:"最近一次打开看板时间"`
	BoardError       string      `json:"boardError"       orm:"board_error"         description:"看板代理错误说明"`
	CreatedAt        *gtime.Time `json:"createdAt"        orm:"created_at"          description:"创建时间"`
	UpdatedAt        *gtime.Time `json:"updatedAt"        orm:"updated_at"          description:"更新时间"`
	DeletedAt        *gtime.Time `json:"deletedAt"        orm:"deleted_at"          description:"删除时间"`
}

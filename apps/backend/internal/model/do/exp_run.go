// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// ExpRun is the golang structure of table exp_run for DAO operations like Where/Data.
type ExpRun struct {
	g.Meta           `orm:"table:exp_run, do:true"`
	Id               any         // Run ID
	Name             any         // Run 名称，默认与任务名相同
	ProjectId        any         // 所属项目 ID
	ClusterId        any         // 工作集群 ID
	TeamId           any         // 所属团队 ID
	TeamName         any         // 团队名称快照
	JobId            any         // 关联训练任务 ID
	TbLogdir         any         // TensorBoard logdir
	DatacenterCode   any         // 任务机房标识
	OwnerUserId      any         // 创建人 ID
	OwnerUsername    any         // 创建人账号
	OwnerNickname    any         // 创建人显示名
	LastLoss         any         // 最新 train loss
	LastStep         any         // 最新 step
	MaxSteps         any         // 进度分母，可空
	LastTokensPerSec any         // 最新吞吐标量
	MetricsAt        *gtime.Time // 最近一次成功读盘时间
	MetricsError     any         // 最近一次读盘失败说明
	BoardAccessedAt  *gtime.Time // 最近一次打开看板时间
	BoardError       any         // 看板代理错误说明
	CreatedAt        *gtime.Time // 创建时间
	UpdatedAt        *gtime.Time // 更新时间
	DeletedAt        *gtime.Time // 删除时间
}

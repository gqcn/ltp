// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsQueueTeam is the golang structure of table ops_queue_team for DAO operations like Where/Data.
type OpsQueueTeam struct {
	g.Meta    `orm:"table:ops_queue_team, do:true"`
	Id        any         // 关联 ID
	QueueId   any         // 队列 ID
	TeamId    any         // 团队 ID
	CreatedAt *gtime.Time // 创建时间
}

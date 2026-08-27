// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// OpsQueueTeam is the golang structure for table ops_queue_team.
type OpsQueueTeam struct {
	Id        int64       `json:"id"        orm:"id"         description:"关联 ID"`
	QueueId   int64       `json:"queueId"   orm:"queue_id"   description:"队列 ID"`
	TeamId    int64       `json:"teamId"    orm:"team_id"    description:"团队 ID"`
	CreatedAt *gtime.Time `json:"createdAt" orm:"created_at" description:"创建时间"`
}

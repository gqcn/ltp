// 本文件定义删除实验 Run 契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteExperimentRunReq 软删除一条实验 Run。
type DeleteExperimentRunReq struct {
	g.Meta `path:"/training/experiments/{id}" method:"delete" tags:"Training" summary:"删除实验 Run" dc:"软删除可见 Run，不删除关联训练任务。已删除的 job_id 不再被列表补建。" permission:"training:experiment:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"Run ID" eg:"1"`
}

// DeleteExperimentRunRes 为空。
type DeleteExperimentRunRes struct{}

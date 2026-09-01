// 本文件定义删除实验项目契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteExperimentProjectReq 软删除实验项目。
type DeleteExperimentProjectReq struct {
	g.Meta `path:"/training/experiments/projects/{id}" method:"delete" tags:"Training" summary:"删除实验项目" dc:"软删除非默认项目。其下 Run 改挂到默认项目。默认项目不可删除。" permission:"training:experiment:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"项目 ID" eg:"2"`
}

// DeleteExperimentProjectRes 为空。
type DeleteExperimentProjectRes struct{}

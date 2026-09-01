// 本文件定义移动实验 Run 所属项目契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateExperimentRunReq 把 Run 移动到另一个项目。
type UpdateExperimentRunReq struct {
	g.Meta    `path:"/training/experiments/{id}" method:"put" tags:"Training" summary:"移动实验 Run" dc:"仅允许修改所属项目。目标项目须存在且未删除。" permission:"training:experiment:update"`
	Id        int64 `json:"id" v:"required|min:1" dc:"Run ID" eg:"1"`
	ProjectId int64 `json:"projectId" v:"required|min:1#请选择实验项目" dc:"目标项目 ID" eg:"2"`
}

// UpdateExperimentRunRes 为空。
type UpdateExperimentRunRes struct{}

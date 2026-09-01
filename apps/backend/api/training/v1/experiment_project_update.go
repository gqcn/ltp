// 本文件定义更新实验项目契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateExperimentProjectReq 更新项目名称与描述。
type UpdateExperimentProjectReq struct {
	g.Meta      `path:"/training/experiments/projects/{id}" method:"put" tags:"Training" summary:"更新实验项目" dc:"更新名称与描述。名称须在未删除项目中唯一。默认项目标识 default 不可改名。" permission:"training:experiment:update"`
	Id          int64  `json:"id" v:"required|min:1" dc:"项目 ID" eg:"2"`
	Name        string `json:"name" v:"required|max-length:64#请填写项目名称|项目名称最长 64 个字符" dc:"项目名称" eg:"slm-7b-pretrain"`
	Description string `json:"description" v:"max-length:256#描述最长 256 个字符" dc:"描述" eg:"7B 预训练主线"`
}

// UpdateExperimentProjectRes 为空。
type UpdateExperimentProjectRes struct{}

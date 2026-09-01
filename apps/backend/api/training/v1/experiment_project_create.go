// 本文件定义创建实验项目契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateExperimentProjectReq 创建实验项目。
type CreateExperimentProjectReq struct {
	g.Meta      `path:"/training/experiments/projects" method:"post" tags:"Training" summary:"创建实验项目" dc:"名称须在未删除项目中唯一，创建后仍可修改。默认项目标识 default 不可占用。" permission:"training:experiment:update"`
	Name        string `json:"name" v:"required|max-length:64#请填写项目名称|项目名称最长 64 个字符" dc:"项目名称" eg:"slm-7b-pretrain"`
	Description string `json:"description" v:"max-length:256#描述最长 256 个字符" dc:"可选描述" eg:"7B 预训练主线"`
}

// CreateExperimentProjectRes 返回新项目 ID。
type CreateExperimentProjectRes struct {
	Id int64 `json:"id" dc:"项目 ID" eg:"2"`
}

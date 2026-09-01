// 本文件定义实验项目列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListExperimentProjectsReq 列出实验项目。
type ListExperimentProjectsReq struct {
	g.Meta    `path:"/training/experiments/projects" method:"get" tags:"Training" summary:"列出实验项目" dc:"返回未删除项目。runCount 仅统计当前用户可见且属于请求集群的 Run。" permission:"training:experiment:query"`
	ClusterId int64 `json:"clusterId" v:"required|min:1" dc:"工作集群 ID。" eg:"1"`
}

// ExperimentProject 是项目投影。
type ExperimentProject struct {
	Id          int64  `json:"id" dc:"项目 ID" eg:"1"`
	Name        string `json:"name" dc:"项目名称，创建后只读" eg:"slm-7b-pretrain"`
	DisplayName string `json:"displayName" dc:"显示名称" eg:"默认项目"`
	Description string `json:"description" dc:"描述" eg:"7B 预训练主线"`
	RunCount    int    `json:"runCount" dc:"当前集群可见 Run 数" eg:"12"`
	CreatedAt   int64  `json:"createdAt" dc:"创建时间，Unix timestamp in milliseconds" eg:"1754000000000"`
	UpdatedAt   int64  `json:"updatedAt" dc:"更新时间，Unix timestamp in milliseconds" eg:"1754000000000"`
}

// ListExperimentProjectsRes 是项目列表。
type ListExperimentProjectsRes struct {
	List []*ExperimentProject `json:"list" dc:"项目列表"`
}

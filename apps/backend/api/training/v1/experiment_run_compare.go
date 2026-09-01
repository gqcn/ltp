// 本文件定义实验对比契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CompareExperimentRunsReq 对比 2 至 5 条 Run。
type CompareExperimentRunsReq struct {
	g.Meta `path:"/training/experiments/compare" method:"get" tags:"Training" summary:"对比实验 Run" dc:"返回快照与关联任务配置 Diff。ids 最多 5 个。跨机房时 sameLocation=false，不提供 TensorBoard 叠加。" permission:"training:experiment:query"`
	Ids    []int64 `json:"ids" v:"required" dc:"Run ID 列表，2 至 5 个。Query 使用 ids[]=1&ids[]=2。" eg:"1"`
}

// ExperimentCompareField 是超参 Diff 的一行。
type ExperimentCompareField struct {
	Key    string   `json:"key" dc:"字段名" eg:"image"`
	Values []string `json:"values" dc:"与 runs 顺序对应的取值"`
	Same   bool     `json:"same" dc:"各 Run 取值是否相同" eg:"false"`
}

// CompareExperimentRunsRes 是对比结果。
type CompareExperimentRunsRes struct {
	Runs         []*ExperimentRunDetail   `json:"runs" dc:"按请求顺序的 Run 详情"`
	Fields       []ExperimentCompareField `json:"fields" dc:"配置 Diff 行"`
	SameLocation bool                     `json:"sameLocation" dc:"是否同一集群且同一机房，允许 TensorBoard 多 logdir 对比" eg:"true"`
}

// 本文件定义读取训练任务 Pod 日志契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetJobLogsReq 读取单个 Pod 容器日志。
type GetJobLogsReq struct {
	g.Meta    `path:"/training/jobs/{id}/pods/{pod}/logs" method:"get" tags:"Training" summary:"读取 Pod 日志" dc:"通过 Kubernetes 日志 API 读取训练容器最近日志，不是 Elasticsearch。" permission:"training:job:query"`
	Id        int64  `json:"id" v:"required|min:1" dc:"任务 ID" eg:"1"`
	Pod       string `json:"pod" v:"required" dc:"Pod 名" eg:"slm-7b-pretrain-phase4-worker-0"`
	TailLines int64  `json:"tailLines" d:"500" v:"min:1|max:2000" dc:"返回的末尾行数，默认 500，最大 2000。" eg:"500"`
}

// GetJobLogsRes 是日志文本。
type GetJobLogsRes struct {
	Content string `json:"content" dc:"日志文本" eg:"container started"`
}

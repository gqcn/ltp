// 本文件定义打开实验 TensorBoard 看板契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// OpenExperimentBoardReq 确保 serve Pod 并返回反代前缀。
type OpenExperimentBoardReq struct {
	g.Meta `path:"/training/experiments/{id}/board" method:"post" tags:"Training" summary:"打开实验 TensorBoard" dc:"记录访问时间，在任务所在机房按需拉起看板 Pod，返回同源反代前缀。完整曲线仍读机房 tfevents。" permission:"training:experiment:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"Run ID" eg:"1"`
}

// OpenExperimentBoardRes 是看板入口。
type OpenExperimentBoardRes struct {
	ProxyPath string `json:"proxyPath" dc:"同源反代前缀，前端 iframe 或新标签打开。始终为当前服务地址。" eg:"/api/training/experiments/1/board/"`
	Ready     bool   `json:"ready" dc:"serve Pod 是否已就绪" eg:"true"`
	Message   string `json:"message" dc:"未就绪或失败时的中文说明。成功可为空。" eg:""`
}

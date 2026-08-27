// 本文件定义集群连通测试接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ProbeReq 对已保存凭证执行连通测试。
type ProbeReq struct {
	g.Meta `path:"/clusters/{id}/probe" method:"post" tags:"Cluster" summary:"连通测试" dc:"使用已保存 Kubeconfig 探测 API Server，成功则刷新版本与同步时间；失败将状态标为离线并返回业务错误。" permission:"ops:cluster:update"`
	Id     int64 `json:"id" v:"required|min:1" dc:"集群 ID" eg:"1"`
}

// ProbeRes 返回探测后的版本与状态。
type ProbeRes struct {
	Status     string `json:"status" dc:"连通状态。healthy=健康 offline=离线。" eg:"healthy"`
	Version    string `json:"version" dc:"Kubernetes 版本" eg:"v1.27.16"`
	ApiServer  string `json:"apiServer" dc:"API Server 地址" eg:"https://127.0.0.1:6443"`
	LastSyncAt int64  `json:"lastSyncAt" dc:"本次成功时间，Unix 毫秒时间戳。失败时为 0。" eg:"1754000000000"`
}

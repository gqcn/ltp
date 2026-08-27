// 本文件定义节点数据中心、标签、污点与隔离入池接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// AssignDatacenterReq 为节点设置或清除数据中心标签。
type AssignDatacenterReq struct {
	g.Meta    `path:"/nodes/datacenter" method:"put" tags:"Node" summary:"分配数据中心" dc:"将 maip.io/datacenter 写入指定节点。code 为空表示清除标签回到未分配。names 最多 100 个。" permission:"ops:node:update"`
	ClusterId int64    `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Names     []string `json:"names" v:"required|min-length:1" dc:"节点名列表，最多 100 个。" eg:"[\"ltp-control-plane\"]"`
	Code      string   `json:"code" dc:"数据中心标识。空字符串表示清除。" eg:"cq-lj"`
	Remark    string   `json:"remark" v:"max-length:256#最长 256 个字符" dc:"可选备注，记入维护记录。" eg:"批量分配两江"`
}

// AssignDatacenterRes 为空。
type AssignDatacenterRes struct{}

// UpdateLabelsReq 覆盖式写入一组标签键。
type UpdateLabelsReq struct {
	g.Meta    `path:"/nodes/labels" method:"put" tags:"Node" summary:"更新节点标签" dc:"对指定节点合并写入 labels；值为空字符串的键表示删除。最多 100 台。" permission:"ops:node:update"`
	ClusterId int64             `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Names     []string          `json:"names" v:"required|min-length:1" dc:"节点名列表" eg:"[\"ltp-control-plane\"]"`
	Labels    map[string]string `json:"labels" dc:"要合并的标签。空值表示删除该键。" eg:"{\"maip.io/gpu-type\":\"H100-80G\"}"`
	Remark    string            `json:"remark" v:"max-length:256#最长 256 个字符" dc:"可选备注" eg:"标记卡型号"`
}

// UpdateLabelsRes 为空。
type UpdateLabelsRes struct{}

// UpdateTaintsReq 以给定列表替换节点上由平台管理的污点集合之外的自定义污点；完整替换请求中的污点列表。
type UpdateTaintsReq struct {
	g.Meta    `path:"/nodes/taints" method:"put" tags:"Node" summary:"更新节点污点" dc:"用 taints 完整替换指定节点的污点列表。最多 100 台。" permission:"ops:node:update"`
	ClusterId int64       `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Names     []string    `json:"names" v:"required|min-length:1" dc:"节点名列表" eg:"[\"ltp-control-plane\"]"`
	Taints    []TaintItem `json:"taints" dc:"替换后的完整污点列表。空数组表示清除全部污点。" eg:"[]"`
	Remark    string      `json:"remark" v:"max-length:256#最长 256 个字符" dc:"可选备注" eg:"清理污点"`
}

// UpdateTaintsRes 为空。
type UpdateTaintsRes struct{}

// IsolateReq 整节点隔离。
type IsolateReq struct {
	g.Meta    `path:"/nodes/isolate" method:"post" tags:"Node" summary:"隔离节点" dc:"对指定节点执行 cordon 并添加 maip.io/fault=true:NoSchedule 污点。最多 100 台。" permission:"ops:node:update"`
	ClusterId int64    `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Names     []string `json:"names" v:"required|min-length:1" dc:"节点名列表" eg:"[\"ltp-control-plane\"]"`
	Remark    string   `json:"remark" v:"max-length:256#最长 256 个字符" dc:"可选备注" eg:"计划维护"`
}

// IsolateRes 为空。
type IsolateRes struct{}

// RecoverReq 整节点入池。
type RecoverReq struct {
	g.Meta    `path:"/nodes/recover" method:"post" tags:"Node" summary:"节点入池" dc:"对指定节点执行 uncordon 并移除故障污点与 maip.io/fault 标签。最多 100 台。" permission:"ops:node:update"`
	ClusterId int64    `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Names     []string `json:"names" v:"required|min-length:1" dc:"节点名列表" eg:"[\"ltp-control-plane\"]"`
	Remark    string   `json:"remark" v:"max-length:256#最长 256 个字符" dc:"可选备注" eg:"维护结束"`
}

// RecoverRes 为空。
type RecoverRes struct{}

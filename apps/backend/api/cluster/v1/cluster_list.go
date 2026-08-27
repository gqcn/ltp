// 本文件定义集群列表接口契约，含 KPI 汇总字段。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询分页集群列表。
type ListReq struct {
	g.Meta   `path:"/clusters" method:"get" tags:"Cluster" summary:"列出集群" dc:"按关键词分页查询已接入 Kubernetes 集群。节点与资源用量按当前集群实时探测后批量装配，Kubeconfig 明文不返回。" permission:"ops:cluster:query"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。省略时默认为 1。" eg:"1"`
	PageSize int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配显示名称、标识、区域或说明。空表示不按关键词过滤。" eg:"训练"`
}

// ResourceUsage 是 CPU / 内存 / GPU 占用相对物理总量。
type ResourceUsage struct {
	Used  int64  `json:"used" dc:"当前占用。GPU 为卡数，CPU 为毫核，内存为字节。" eg:"4"`
	Total int64  `json:"total" dc:"物理总量，单位与 used 相同。" eg:"8"`
	Unit  string `json:"unit" dc:"单位：gpu / milliCPU / bytes。" eg:"gpu"`
}

// GPUTypeUsage 按卡型号聚合的 GPU 用量。
type GPUTypeUsage struct {
	Type  string `json:"type" dc:"卡型号。未知时为空字符串。" eg:"H100-80G"`
	Used  int64  `json:"used" dc:"已用卡数" eg:"2"`
	Total int64  `json:"total" dc:"总卡数" eg:"8"`
}

// DatacenterRef 是集群关联的数据中心角标投影。
type DatacenterRef struct {
	Code      string `json:"code" dc:"数据中心标识" eg:"cq-lj"`
	Name      string `json:"name" dc:"显示名称" eg:"重庆两江"`
	ShortName string `json:"shortName" dc:"简称" eg:"两江"`
	Color     string `json:"color" dc:"角标颜色" eg:"#3b82f6"`
}

// ListItem 是列表中的一条集群。
type ListItem struct {
	Id            int64           `json:"id" dc:"集群 ID" eg:"1"`
	Name          string          `json:"name" dc:"稳定标识" eg:"slm-gpu-cluster-01"`
	DisplayName   string          `json:"displayName" dc:"显示名称" eg:"训练集群"`
	Description   string          `json:"description" dc:"说明" eg:"kind 本地实验集群"`
	ApiServer     string          `json:"apiServer" dc:"API Server 地址。探测失败时可能为空。" eg:"https://127.0.0.1:6443"`
	Version       string          `json:"version" dc:"Kubernetes 版本" eg:"v1.27.16"`
	Status        string          `json:"status" dc:"连通状态。healthy=健康 offline=离线 unknown=未知。" eg:"healthy"`
	Datacenters   []DatacenterRef `json:"datacenters" dc:"由节点标签聚合的数据中心"`
	NodesReady    int             `json:"nodesReady" dc:"Ready 节点数" eg:"1"`
	NodesTotal    int             `json:"nodesTotal" dc:"节点总数" eg:"1"`
	GPU           ResourceUsage   `json:"gpu" dc:"GPU 实际占用 / 物理总量"`
	CPU           ResourceUsage   `json:"cpu" dc:"CPU 实际占用 / 物理总量，单位毫核"`
	Memory        ResourceUsage   `json:"memory" dc:"内存实际占用 / 物理总量，单位字节"`
	GPUByType     []GPUTypeUsage  `json:"gpuByType" dc:"按卡型号拆分的 GPU 用量"`
	KubeconfigSet bool            `json:"kubeconfigSet" dc:"是否已保存 Kubeconfig。恒为 true。" eg:"true"`
	LastSyncAt    int64           `json:"lastSyncAt" dc:"最近成功连通时间，Unix 毫秒时间戳。从未成功时为 0。" eg:"1754000000000"`
	CreatedAt     int64           `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
	UpdatedAt     int64           `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListSummary 是页面 KPI。
type ListSummary struct {
	Total      int   `json:"total" dc:"接入集群数" eg:"1"`
	Healthy    int   `json:"healthy" dc:"健康集群数" eg:"1"`
	ReadyNodes int   `json:"readyNodes" dc:"全部集群 Ready 节点合计" eg:"1"`
	TotalNodes int   `json:"totalNodes" dc:"全部集群节点合计" eg:"1"`
	GPUTotal   int64 `json:"gpuTotal" dc:"全部集群 GPU 物理总量" eg:"0"`
}

// ListRes 是分页集群列表。
type ListRes struct {
	List    []*ListItem `json:"list" dc:"当前页集群列表"`
	Total   int         `json:"total" dc:"筛选后的匹配总数" eg:"1"`
	Summary ListSummary `json:"summary" dc:"与当前搜索无关的未筛选 KPI 快照"`
}

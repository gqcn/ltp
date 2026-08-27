// 本文件定义节点列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// TaintItem 是 Kubernetes 污点投影。
type TaintItem struct {
	Key    string `json:"key" dc:"污点键" eg:"maip.io/fault"`
	Value  string `json:"value" dc:"污点值" eg:"true"`
	Effect string `json:"effect" dc:"效果。NoSchedule / PreferNoSchedule / NoExecute。" eg:"NoSchedule"`
}

// ListReq 按工作集群列出 Kubernetes 节点。
type ListReq struct {
	g.Meta     `path:"/nodes" method:"get" tags:"Node" summary:"列出节点" dc:"从指定工作集群实时读取节点。筛选与分页在一次 List Nodes + List Pods 装配后于服务端完成。禁止按节点循环调用 Kubernetes API。" permission:"ops:node:query"`
	ClusterId  int64  `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	PageNum    int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize   int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	Keyword    string `json:"keyword" dc:"可选模糊匹配节点名或 IP。" eg:"kind"`
	Datacenter string `json:"datacenter" dc:"可选数据中心标识。all 或不传表示全部；unset 表示未分配。" eg:"unset"`
	Status     string `json:"status" dc:"可选状态。all 或不传表示全部；Ready / NotReady / SchedulingDisabled。" eg:"Ready"`
	GpuType    string `json:"gpuType" dc:"可选卡型号。all 或不传表示全部。" eg:"H100-80G"`
}

// ListItem 是列表中的一台节点。
type ListItem struct {
	Name          string            `json:"name" dc:"节点名" eg:"ltp-control-plane"`
	IP            string            `json:"ip" dc:"内网 IP" eg:"172.18.0.2"`
	Roles         []string          `json:"roles" dc:"节点角色" eg:"[\"control-plane\"]"`
	Ready         bool              `json:"ready" dc:"kubelet Ready 条件是否为 True" eg:"true"`
	Schedulable   bool              `json:"schedulable" dc:"是否可调度（未 cordon）" eg:"true"`
	Status        string            `json:"status" dc:"展示状态。Ready / NotReady / SchedulingDisabled。" eg:"Ready"`
	Datacenter    string            `json:"datacenter" dc:"maip.io/datacenter 标签值。未分配时为空字符串。" eg:"cq-lj"`
	GPUType       string            `json:"gpuType" dc:"卡型号" eg:""`
	HasIB         bool              `json:"hasIB" dc:"是否具备 IB" eg:"false"`
	IBDomain      string            `json:"ibDomain" dc:"IB 拓扑域。无则为空。" eg:""`
	Isolated      bool              `json:"isolated" dc:"是否处于故障隔离" eg:"false"`
	IsolateRemark string            `json:"isolateRemark" dc:"最近一次成功隔离的备注。未隔离或无维护记录时为空。" eg:"计划维护"`
	PodCount      int               `json:"podCount" dc:"当前 Pod 数" eg:"8"`
	PodCapacity   int               `json:"podCapacity" dc:"节点 Pod 容量" eg:"110"`
	GPUUsed       int64             `json:"gpuUsed" dc:"已分配 GPU 卡数" eg:"0"`
	GPUTotal      int64             `json:"gpuTotal" dc:"可分配 GPU 卡数" eg:"0"`
	CPUUsedMilli  int64             `json:"cpuUsedMilli" dc:"已分配 CPU 毫核" eg:"500"`
	CPUTotalMilli int64             `json:"cpuTotalMilli" dc:"可分配 CPU 毫核" eg:"8000"`
	MemUsedBytes  int64             `json:"memUsedBytes" dc:"已分配内存字节" eg:"1073741824"`
	MemTotalBytes int64             `json:"memTotalBytes" dc:"可分配内存字节" eg:"8589934592"`
	Conditions    []string          `json:"conditions" dc:"异常 Node Condition 名，如 DiskPressure" eg:"[]"`
	Labels        map[string]string `json:"labels" dc:"节点标签"`
	Taints        []TaintItem       `json:"taints" dc:"节点污点"`
}

// ListSummary 是当前筛选前、当前集群的 KPI。
type ListSummary struct {
	Total         int `json:"total" dc:"节点总数" eg:"1"`
	Ready         int `json:"ready" dc:"Ready 且可调度" eg:"1"`
	NotReady      int `json:"notReady" dc:"NotReady" eg:"0"`
	Unschedulable int `json:"unschedulable" dc:"已 cordon" eg:"0"`
	UnsetDc       int `json:"unsetDc" dc:"未分配数据中心" eg:"1"`
}

// ListRes 是分页节点列表。
type ListRes struct {
	List     []*ListItem `json:"list" dc:"当前页节点"`
	Total    int         `json:"total" dc:"筛选后的匹配总数" eg:"1"`
	Summary  ListSummary `json:"summary" dc:"当前集群未筛选 KPI"`
	GpuTypes []string    `json:"gpuTypes" dc:"当前集群出现过的卡型号，供筛选项" eg:"[]"`
}

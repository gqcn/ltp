// Package consts 存放非模块枚举的全局常量。业务枚举应放在所属服务包内。
package consts

const (
	// LabelKeyDatacenter 是数据中心绑定使用的固定 Kubernetes 标签键。
	LabelKeyDatacenter = "maip.io/datacenter"
	// LabelKeyGPUType 是节点卡型号标签键。
	LabelKeyGPUType = "maip.io/gpu-type"
	// LabelKeyIB 标记节点是否具备 IB。
	LabelKeyIB = "maip.io/ib"
	// LabelKeyIBDomain 是 IB 拓扑域标签键。
	LabelKeyIBDomain = "maip.io/ib-domain"
	// LabelKeyFault 标记故障隔离节点。
	LabelKeyFault = "maip.io/fault"
	// TaintKeyFault 是故障隔离污点键。
	TaintKeyFault = "maip.io/fault"
	// GPUResourceName 是 NVIDIA GPU 扩展资源名。
	GPUResourceName = "nvidia.com/gpu"
	// CookieNameDefault 是默认会话 Cookie 名。
	CookieNameDefault = "ltp_session"
)

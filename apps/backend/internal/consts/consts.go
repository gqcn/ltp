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
	// TrainingNamespace 是训练 Job 与 ConfigMap 使用的命名空间。
	TrainingNamespace = "maip"
	// LabelKeyManaged 标记平台创建的 Volcano Job。
	LabelKeyManaged = "maip.io/managed"
	// LabelKeyOwner 是任务运行用户账号标签。
	LabelKeyOwner = "maip.io/owner"
	// LabelKeyTeamID 是任务所属团队 ID 标签。
	LabelKeyTeamID = "maip.io/team-id"
	// AnnotationKeyPriority 是任务优先级注解。
	AnnotationKeyPriority = "maip.io/priority"
	// TrainingContainerName 是训练容器名。
	TrainingContainerName = "training"
	// TrainingTaskName 是 Volcano Job 唯一 task 名。
	TrainingTaskName = "worker"
	// TrainingMasterPort 是注入的 MASTER_PORT。
	TrainingMasterPort = "23456"
	// EnvTensorBoardLogDir 是注入训练容器的 TensorBoard 目录环境变量名。
	EnvTensorBoardLogDir = "TENSORBOARD_LOGDIR"
	// LabelKeyAgent 标记平台实验代理对象。
	LabelKeyAgent = "maip.io/agent"
	// LabelKeyAgentRole 是实验代理角色。
	LabelKeyAgentRole = "maip.io/role"
	// LabelKeyRunID 是实验 Run 数字 ID。
	LabelKeyRunID = "maip.io/run-id"
	// AgentLabelValue 是实验代理对象的 agent 标签值。
	AgentLabelValue = "experiment"
	// AgentImageDefault 是实验代理默认镜像。
	AgentImageDefault = "ltp/experiment-agent:dev"
	// ExperimentAgentPort 是 TensorBoard 服务端口。
	ExperimentAgentPort = int32(6006)
)

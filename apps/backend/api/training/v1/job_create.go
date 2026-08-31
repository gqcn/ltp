// 本文件定义提交训练任务契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// EnvEntry 是一条用户环境变量。
type EnvEntry struct {
	Key   string `json:"key" dc:"变量名" eg:"EPOCHS"`
	Value string `json:"value" dc:"变量值" eg:"1000"`
}

// MountInput 是提交任务时的配置挂载。
type MountInput struct {
	SetId     int64    `json:"setId" v:"required|min:1" dc:"配置集 ID" eg:"1"`
	Version   int      `json:"version" v:"required|min:1" dc:"已发布版本号。提交时最新须先解析为具体版本号。" eg:"1"`
	MountPath string   `json:"mountPath" v:"required|max-length:256#请填写挂载路径|挂载路径最长 256 个字符" dc:"容器内只读挂载路径" eg:"/data/hpc/home/guoqiang/experiments/slm-7b/configs"`
	Files     []string `json:"files" dc:"可选。整包目录时省略；按文件挂载时传入所选相对路径。省略则挂载该版本全部文件。" eg:"7b.yaml"`
}

// CreateJobReq 提交训练任务并创建 Volcano Job。
type CreateJobReq struct {
	g.Meta       `path:"/training/jobs" method:"post" tags:"Training" summary:"提交训练任务" dc:"在工作集群 maip 命名空间创建 Volcano Job。名称须符合 DNS-1123 且通过 IsQualifiedName。超额申请允许排队。本地管理员必须指定 LDAP 运行用户。" permission:"training:job:create"`
	ClusterId    int64        `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Name         string       `json:"name" v:"required|max-length:63#请填写任务名称|任务名称最长 63 个字符" dc:"任务名称，即 Volcano Job 对象名。" eg:"slm-7b-pretrain-phase4"`
	Workdir      string       `json:"workdir" v:"required|max-length:256#请填写工作路径|工作路径最长 256 个字符" dc:"容器工作路径" eg:"/data/hpc/home/guoqiang"`
	Priority     string       `json:"priority" v:"required|in:P0,P1,P2,P3#请选择优先级" dc:"优先级。P0 最高，P3 最低。" eg:"P2"`
	TeamId       int64        `json:"teamId" v:"required|min:1" dc:"所属团队 ID" eg:"1"`
	QueueId      int64        `json:"queueId" v:"required|min:1" dc:"资源队列 ID" eg:"1"`
	Nodes        int          `json:"nodes" v:"required|min:1#请填写有效的节点数" dc:"节点数" eg:"1"`
	GpusPerNode  int          `json:"gpusPerNode" v:"required|min:1|max:8#请填写有效的每节点 GPU 数|每节点 GPU 数不能超过 8" dc:"每节点 GPU 数，1–8。" eg:"8"`
	CpuPerNode   int          `json:"cpuPerNode" v:"required|min:1#请填写有效的每节点 CPU 核数" dc:"每节点 CPU 核" eg:"16"`
	MemGiPerNode int          `json:"memGiPerNode" v:"required|min:1#请填写有效的每节点内存" dc:"每节点内存 GiB" eg:"128"`
	Image        string       `json:"image" v:"required|max-length:512#请填写容器镜像地址|镜像地址最长 512 个字符" dc:"完整镜像地址，须包含路径且不含空格。" eg:"harbor.msxf.com/ai/megatron:24.07"`
	Command      string       `json:"command" v:"required#请填写启动命令" dc:"启动命令，可引用平台注入的 $MASTER_ADDR 等变量。" eg:"torchrun --nproc_per_node=$GPU_NUM train.py"`
	Env          []EnvEntry   `json:"env" dc:"可选用户环境变量。"`
	Mounts       []MountInput `json:"mounts" dc:"可选配置挂载。"`
	RunUserId    int64        `json:"runUserId" dc:"运行用户 ID。本地管理员必填，须为已启用 LDAP 用户。普通用户忽略，使用自己。" eg:"2"`
	RerunFromId  int64        `json:"rerunFromId" dc:"可选重跑源任务 ID。" eg:"0"`
}

// CreateJobRes 返回新建任务 ID。
type CreateJobRes struct {
	Id int64 `json:"id" dc:"新建任务 ID" eg:"1"`
}

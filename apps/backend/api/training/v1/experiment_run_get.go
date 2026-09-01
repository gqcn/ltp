// 本文件定义实验 Run 详情契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetExperimentRunReq 读取 Run 详情。
type GetExperimentRunReq struct {
	g.Meta `path:"/training/experiments/{id}" method:"get" tags:"Training" summary:"获取实验 Run 详情" dc:"返回外层快照、logdir 与关联任务配置摘要。不返回 tfevents 文件内容。" permission:"training:experiment:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"Run ID" eg:"1"`
}

// ExperimentRunDetail 是详情。
type ExperimentRunDetail struct {
	ExperimentRunListItem
	Image       string     `json:"image" dc:"关联任务镜像" eg:"harbor.msxf.com/ai/megatron:24.07"`
	Command     string     `json:"command" dc:"关联任务启动命令" eg:"torchrun train.py"`
	Workdir     string     `json:"workdir" dc:"关联任务工作路径" eg:"/data/hpc/home/guoqiang"`
	Nodes       int        `json:"nodes" dc:"节点数" eg:"8"`
	GpusPerNode int        `json:"gpusPerNode" dc:"每节点 GPU" eg:"8"`
	GpuCount    int        `json:"gpuCount" dc:"总 GPU" eg:"64"`
	Env         []EnvEntry `json:"env" dc:"关联任务环境变量"`
}

// GetExperimentRunRes 是详情响应。
type GetExperimentRunRes struct {
	ExperimentRunDetail
}

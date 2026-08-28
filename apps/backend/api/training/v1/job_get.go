// 本文件定义训练任务详情契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// MountFile 是挂载快照中的一个文件。
type MountFile struct {
	Path    string `json:"path" dc:"相对路径" eg:"7b.yaml"`
	Content string `json:"content" dc:"文件内容" eg:"seq_len: 8192"`
	Size    int    `json:"size" dc:"字节数" eg:"24"`
}

// MountSnapshot 是任务上的配置挂载快照。
type MountSnapshot struct {
	SetId       int64       `json:"setId" dc:"配置集 ID" eg:"1"`
	SetName     string      `json:"setName" dc:"配置集标识" eg:"slm-7b-phase3"`
	DisplayName string      `json:"displayName" dc:"显示名称" eg:"SLM 7B Phase3"`
	Version     int         `json:"version" dc:"版本号" eg:"12"`
	MountPath   string      `json:"mountPath" dc:"挂载路径" eg:"/data/hpc/home/guoqiang/experiments/job/configs"`
	Digest      string      `json:"digest" dc:"内容摘要" eg:"a3f8c1d2"`
	Files       []MountFile `json:"files" dc:"文件快照。列表接口为空数组。"`
}

// GetJobReq 读取任务详情。
type GetJobReq struct {
	g.Meta `path:"/training/jobs/{id}" method:"get" tags:"Training" summary:"获取训练任务详情" dc:"返回配置快照。日志检索与任务监控不在本接口查询外部系统。" permission:"training:job:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"任务 ID" eg:"1"`
}

// GetJobRes 是任务详情。
type GetJobRes struct {
	JobListItem
	Namespace string          `json:"namespace" dc:"Kubernetes 命名空间" eg:"maip"`
	Image     string          `json:"image" dc:"容器镜像" eg:"harbor.msxf.com/ai/megatron:24.07"`
	Command   string          `json:"command" dc:"启动命令" eg:"torchrun train.py"`
	Workdir   string          `json:"workdir" dc:"工作路径" eg:"/data/hpc/home/guoqiang"`
	Env       []EnvEntry      `json:"env" dc:"用户环境变量"`
	Mounts    []MountSnapshot `json:"mounts" dc:"配置挂载快照，含文件内容"`
}

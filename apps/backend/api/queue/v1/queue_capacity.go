// 本文件定义队列创建时的资源分配预览接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CapacityPreviewReq 预览指定数据中心的物理容量与已分配额度。
type CapacityPreviewReq struct {
	g.Meta         `path:"/queues/capacity-preview" method:"get" tags:"Queue" summary:"队列额度预览" dc:"按工作集群节点聚合数据中心容量，并减去其他队列已声明额度。本地 kind 模拟 GPU 后总量来自节点 allocatable。" permission:"ops:queue:query"`
	ClusterId      int64    `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	DatacenterCode string   `json:"datacenterCode" v:"required" dc:"数据中心标识" eg:"cq-lj"`
	Features       []string `json:"features" dc:"可选功能特性过滤，例如 ib 只统计具备 IB 的节点。" eg:"[]"`
	ExcludeQueueId int64    `json:"excludeQueueId" dc:"编辑时排除当前队列已占用额度。0 表示不排除。" eg:"0"`
}

// GPUTypeCapacity 是一种卡型号的容量。
type GPUTypeCapacity struct {
	Type      string `json:"type" dc:"卡型号，来自节点 GPU 标签。无标签节点不会出现。" eg:"NVIDIA-H200"`
	Total     int64  `json:"total" dc:"物理 GPU 卡数" eg:"0"`
	Allocated int    `json:"allocated" dc:"其他队列 GPU 额度之和" eg:"8"`
	HasIB     bool   `json:"hasIB" dc:"该型号节点是否具备 IB" eg:"false"`
}

// CapacityPreviewRes 是额度预览。
type CapacityPreviewRes struct {
	GpuTypes     []GPUTypeCapacity `json:"gpuTypes" dc:"按卡型号的 GPU 容量"`
	CpuTotal     int64             `json:"cpuTotal" dc:"CPU 物理总量（核）" eg:"8"`
	CpuAllocated int               `json:"cpuAllocated" dc:"其他队列 CPU 额度之和" eg:"32"`
	MemTotalGi   int64             `json:"memTotalGi" dc:"内存物理总量（GiB）" eg:"16"`
	MemAllocated int               `json:"memAllocated" dc:"其他队列内存额度之和" eg:"64"`
}

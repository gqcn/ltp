// 本文件定义创建队列接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateReq 创建业务队列并同步 Volcano Queue。
type CreateReq struct {
	g.Meta         `path:"/queues" method:"post" tags:"Queue" summary:"创建队列" dc:"在指定集群创建业务队列，并写入同名 scheduling.volcano.sh/v1beta1 Queue。标识须符合 DNS-1123。Volcano 写入失败不落库。" permission:"ops:queue:create"`
	ClusterId      int64    `json:"clusterId" v:"required|min:1" dc:"工作集群 ID" eg:"1"`
	Name           string   `json:"name" v:"required|max-length:63#请填写队列标识|队列标识最长 63 个字符" dc:"队列标识，即 Volcano Queue 对象名，创建后不可改。须符合 Kubernetes DNS-1123 子域（小写字母、数字、连字符与点，最长 63），且不能为 root 或 default。" eg:"lab-default"`
	DisplayName    string   `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"实验默认队列"`
	DatacenterCode string   `json:"datacenterCode" v:"required|max-length:64#请选择数据中心|最长 64 个字符" dc:"绑定的数据中心标识" eg:"cq-lj"`
	GpuType        string   `json:"gpuType" v:"required|max-length:64#请选择 GPU 型号|最长 64 个字符" dc:"卡型号，来自节点 maip.io/gpu-type 或 nvidia.com/gpu.product。" eg:"NVIDIA-H200"`
	GpuQuota       int      `json:"gpuQuota" v:"min:0#额度不能为负数" dc:"GPU 额度（卡）" eg:"8"`
	CpuQuota       int      `json:"cpuQuota" v:"min:0#额度不能为负数" dc:"CPU 额度（核）" eg:"32"`
	MemQuotaGi     int      `json:"memQuotaGi" v:"min:0#额度不能为负数" dc:"内存额度（GiB）" eg:"64"`
	TeamIds        []int64  `json:"teamIds" v:"max-length:100#单次最多关联 100 个团队" dc:"关联团队 ID 列表。可为空，表示暂不绑定团队。最多 100 个。" eg:"[]"`
	Features       []string `json:"features" dc:"可选功能特性，目前支持 ib。" eg:"[]"`
	Weight         int      `json:"weight" d:"1" v:"min:1|max:100" dc:"Volcano 权重，默认 1。" eg:"1"`
	Reclaimable    *bool    `json:"reclaimable" dc:"是否允许回收。省略时默认 true。" eg:"true"`
	Description    string   `json:"description" v:"max-length:256#最长 256 个字符" dc:"说明" eg:"kind 验收队列"`
}

// CreateRes 返回新建队列 ID。
type CreateRes struct {
	Id int64 `json:"id" dc:"新建队列 ID" eg:"1"`
}

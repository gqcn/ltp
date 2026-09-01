// 本文件定义更新与启停队列接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateReq 更新队列元数据与额度，并同步 Volcano Queue。
type UpdateReq struct {
	g.Meta         `path:"/queues/{id}" method:"put" tags:"Queue" summary:"编辑队列" dc:"标识不可改。更新额度、团队、功能特性后同步 Volcano Queue capability。" permission:"ops:queue:update"`
	Id             int64    `json:"id" v:"required|min:1" dc:"队列 ID" eg:"1"`
	DisplayName    string   `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"实验默认队列"`
	DatacenterCode string   `json:"datacenterCode" v:"required|max-length:64#请选择数据中心|最长 64 个字符" dc:"数据中心标识" eg:"cq-lj"`
	GpuType        string   `json:"gpuType" v:"required|max-length:64#请选择 GPU 型号|最长 64 个字符" dc:"卡型号" eg:"NVIDIA-H200"`
	GpuQuota       int      `json:"gpuQuota" v:"min:0#额度不能为负数" dc:"GPU 额度（卡）" eg:"8"`
	CpuQuota       int      `json:"cpuQuota" v:"min:0#额度不能为负数" dc:"CPU 额度（核）" eg:"32"`
	MemQuotaGi     int      `json:"memQuotaGi" v:"min:0#额度不能为负数" dc:"内存额度（GiB）" eg:"64"`
	TeamIds        []int64  `json:"teamIds" v:"max-length:100#单次最多关联 100 个团队" dc:"关联团队 ID 列表。可为空，表示解除全部绑定。最多 100 个。" eg:"[]"`
	Features       []string `json:"features" dc:"功能特性" eg:"[]"`
	Weight         int      `json:"weight" d:"1" v:"min:1|max:100" dc:"权重" eg:"1"`
	Reclaimable    *bool    `json:"reclaimable" dc:"是否允许回收。省略时保持原值。" eg:"true"`
	Description    string   `json:"description" v:"max-length:256#最长 256 个字符" dc:"说明" eg:"kind 验收队列"`
}

// UpdateRes 为空。
type UpdateRes struct{}

// UpdateStatusReq 启用或禁用队列。
type UpdateStatusReq struct {
	g.Meta  `path:"/queues/{id}/status" method:"put" tags:"Queue" summary:"启用或禁用队列" dc:"启用对应 Volcano Queue 状态 Open，禁用对应 Closed。禁用后新建任务不可选择该队列。" permission:"ops:queue:update"`
	Id      int64 `json:"id" v:"required|min:1" dc:"队列 ID" eg:"1"`
	Enabled bool  `json:"enabled" dc:"true 启用，false 禁用。" eg:"false"`
}

// UpdateStatusRes 为空。
type UpdateStatusRes struct{}

// 本文件定义数据中心启停接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateStatusReq 启用或停用一条数据中心。
type UpdateStatusReq struct {
	g.Meta  `path:"/datacenters/{id}/status" method:"put" tags:"Datacenter" summary:"更新数据中心状态" dc:"启用或停用一条数据中心。内置默认数据中心不可停用。" permission:"ops:datacenter:update"`
	Id      int64 `json:"id" v:"required|min:1" dc:"数据中心 ID" eg:"2"`
	Enabled bool  `json:"enabled" dc:"目标启用状态。true 启用，false 停用。" eg:"false"`
}

// UpdateStatusRes 成功时为空。
type UpdateStatusRes struct{}

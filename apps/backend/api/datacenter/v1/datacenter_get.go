// 本文件定义数据中心详情接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetReq 按 ID 加载一条数据中心。
type GetReq struct {
	g.Meta `path:"/datacenters/{id}" method:"get" tags:"Datacenter" summary:"获取数据中心" dc:"按数字 ID 返回一条数据中心，含关联计数。缺失或已删除记录返回未找到业务错误。" permission:"ops:datacenter:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"数据中心 ID" eg:"2"`
}

// GetRes 是数据中心详情载荷。
type GetRes struct {
	ListItem
}

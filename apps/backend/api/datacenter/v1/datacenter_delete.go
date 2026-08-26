// 本文件定义数据中心删除接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// DeleteReq 软删除一条数据中心。
type DeleteReq struct {
	g.Meta `path:"/datacenters/{id}" method:"delete" tags:"Datacenter" summary:"删除数据中心" dc:"软删除一条数据中心。内置默认数据中心不可删除。关联资源会改挂到默认数据中心；本迭代尚无此类关联。" permission:"ops:datacenter:delete"`
	Id     int64 `json:"id" v:"required|min:1" dc:"数据中心 ID" eg:"2"`
}

// DeleteRes 成功时为空。
type DeleteRes struct{}

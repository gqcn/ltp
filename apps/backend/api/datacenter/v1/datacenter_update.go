// 本文件定义数据中心元数据更新接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateReq 更新数据中心元数据。标识不可改。
type UpdateReq struct {
	g.Meta      `path:"/datacenters/{id}" method:"put" tags:"Datacenter" summary:"更新数据中心" dc:"更新一条数据中心的展示元数据。标识与标签键不可改。" permission:"ops:datacenter:update"`
	Id          int64  `json:"id" v:"required|min:1" dc:"数据中心 ID" eg:"2"`
	Name        string `json:"name" v:"required|max-length:128" dc:"显示名称" eg:"重庆两江"`
	ShortName   string `json:"shortName" v:"required|max-length:32" dc:"列表角标使用的简称" eg:"两江"`
	Region      string `json:"region" v:"max-length:64" dc:"区域文本。空字符串表示清空区域。" eg:"重庆"`
	Color       string `json:"color" v:"max-length:16" dc:"角标颜色，格式 #RRGGBB" eg:"#3b82f6"`
	Description string `json:"description" v:"max-length:512" dc:"说明" eg:"两江数据中心 · 主训练资源区"`
}

// UpdateRes 成功时为空。
type UpdateRes struct{}

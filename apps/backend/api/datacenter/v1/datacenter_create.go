// 本文件定义数据中心创建接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// CreateReq 创建数据中心。
type CreateReq struct {
	g.Meta      `path:"/datacenters" method:"post" tags:"Datacenter" summary:"创建数据中心" dc:"创建一条启用的数据中心。标识须为小写字母、数字和连字符，不能以连字符开头或结尾。标签键固定为 maip.io/datacenter。节点未配置该标签时保持未分配。" permission:"ops:datacenter:create"`
	Code        string `json:"code" v:"required|max-length:63#请填写数据中心标识|数据中心标识最长 63 个字符" dc:"不可变业务标识。小写字母、数字、连字符，符合 DNS-1123，最长 63。" eg:"cq-lj"`
	Name        string `json:"name" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"重庆两江"`
	ShortName   string `json:"shortName" v:"required|max-length:64#请填写简称|最长 64 个字符" dc:"列表角标使用的简称" eg:"两江"`
	Region      string `json:"region" v:"max-length:64#最长 64 个字符" dc:"可选区域文本。省略时为空。" eg:"重庆"`
	Color       string `json:"color" v:"max-length:16#颜色值过长" dc:"可选角标颜色，格式 #RRGGBB。省略或非法时默认为 #3b82f6。" eg:"#3b82f6"`
	Description string `json:"description" v:"max-length:256#最长 256 个字符" dc:"可选说明" eg:"两江数据中心 · 主训练资源区"`
}

// CreateRes 返回新建数据中心 ID。
type CreateRes struct {
	Id int64 `json:"id" dc:"新建数据中心 ID" eg:"2"`
}

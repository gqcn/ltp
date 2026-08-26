// 本文件定义角色列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询内置角色列表。
type ListReq struct {
	g.Meta `path:"/roles" method:"get" tags:"Role" summary:"列出角色" dc:"返回平台内置角色。用户数按角色编码一次批量统计，不按角色循环查询。" permission:"platform:role:query"`
}

// ListItem 是一条内置角色。
type ListItem struct {
	Id          int64    `json:"id" dc:"角色 ID" eg:"1"`
	Code        string   `json:"code" dc:"不可变角色编码。algo 或 sre。" eg:"algo"`
	Name        string   `json:"name" dc:"显示名称" eg:"算法工程师"`
	Description string   `json:"description" dc:"说明" eg:"算法研发与训练任务提交"`
	Menus       []string `json:"menus" dc:"菜单分区。取值 training、ops、platform。" eg:"[\"training\"]"`
	Builtin     bool     `json:"builtin" dc:"是否内置角色" eg:"true"`
	UserCount   int      `json:"userCount" dc:"当前分配该角色的平台用户数" eg:"8"`
	UpdatedBy   string   `json:"updatedBy" dc:"最近改名操作者显示名" eg:"平台管理员"`
	UpdatedAt   int64    `json:"updatedAt" dc:"最近更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListRes 是角色列表。
type ListRes struct {
	List []*ListItem `json:"list" dc:"角色列表"`
}

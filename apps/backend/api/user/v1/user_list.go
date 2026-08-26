// 本文件定义平台用户列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询分页平台用户列表。
type ListReq struct {
	g.Meta   `path:"/users" method:"get" tags:"User" summary:"列出平台用户" dc:"按关键词、角色和启用状态分页查询从 LDAP 加入的平台用户。筛选、排序与分页在返回当前页之前于数据库侧完成。角色名称与所属团队批量装配。本地管理员不出现在列表中。" permission:"platform:user:query"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。省略时默认为 1。" eg:"1"`
	PageSize int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配姓名、账号、邮箱或部门。空表示不按关键词过滤。" eg:"郭"`
	RoleCode string `json:"roleCode" dc:"可选角色编码过滤。省略或空表示全部。取值 algo 或 sre。" eg:"algo"`
	Enabled  *bool  `json:"enabled" dc:"可选启用状态过滤。省略返回全部，true 为启用，false 为停用。" eg:"true"`
}

// TeamRef 是用户所属团队的最小投影。
type TeamRef struct {
	Id   int64  `json:"id" dc:"团队 ID" eg:"1"`
	Name string `json:"name" dc:"团队名称" eg:"SLM预训练"`
}

// ListItem 是列表响应中的一行平台用户。
type ListItem struct {
	Id          int64     `json:"id" dc:"用户 ID" eg:"2"`
	Username    string    `json:"username" dc:"域账号" eg:"algo"`
	Nickname    string    `json:"nickname" dc:"显示名称" eg:"算法工程师"`
	Email       string    `json:"email" dc:"邮箱。未设置时为空字符串。" eg:"algo@msxf.com"`
	Department  string    `json:"department" dc:"部门。未设置时为空字符串。" eg:"人工智能中心 / 算法"`
	Title       string    `json:"title" dc:"职位。未设置时为空字符串。" eg:"算法工程师"`
	RoleCode    string    `json:"roleCode" dc:"角色编码。algo 或 sre。" eg:"algo"`
	RoleName    string    `json:"roleName" dc:"角色显示名称" eg:"算法工程师"`
	Teams       []TeamRef `json:"teams" dc:"所属团队名称投影。未加入团队时为空数组。"`
	Enabled     bool      `json:"enabled" dc:"是否启用。停用后无法 LDAP 登录。" eg:"true"`
	LastLoginAt int64     `json:"lastLoginAt" dc:"最近登录时间，Unix 毫秒时间戳。从未登录时为 0。" eg:"1754000000000"`
	CreatedAt   int64     `json:"createdAt" dc:"加入平台时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListRes 是分页平台用户列表。
type ListRes struct {
	List  []*ListItem `json:"list" dc:"当前页平台用户列表"`
	Total int         `json:"total" dc:"筛选后的匹配总数" eg:"11"`
}

// 本文件定义团队列表接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListReq 查询分页团队列表。
type ListReq struct {
	g.Meta   `path:"/teams" method:"get" tags:"Team" summary:"列出团队" dc:"按关键词分页查询虚拟团队。筛选与分页在数据库侧完成。负责人与成员数批量装配。" permission:"platform:team:query"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。省略时默认为 1。" eg:"1"`
	PageSize int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配团队名称、描述或负责人显示名。空表示不按关键词过滤。" eg:"SLM"`
}

// OwnerRef 是负责人最小投影。
type OwnerRef struct {
	Id       int64  `json:"id" dc:"用户 ID" eg:"3"`
	Username string `json:"username" dc:"域账号" eg:"guoqiang"`
	Nickname string `json:"nickname" dc:"显示名称" eg:"郭强"`
}

// ListItem 是列表中的一条团队。
type ListItem struct {
	Id          int64    `json:"id" dc:"团队 ID" eg:"1"`
	Name        string   `json:"name" dc:"团队名称" eg:"SLM预训练"`
	Description string   `json:"description" dc:"描述。未设置时为空字符串。" eg:"小模型预训练主线"`
	Owner       OwnerRef `json:"owner" dc:"负责人投影"`
	MemberCount int      `json:"memberCount" dc:"成员人数，含负责人" eg:"4"`
	CreatedAt   int64    `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListRes 是分页团队列表。
type ListRes struct {
	List  []*ListItem `json:"list" dc:"当前页团队列表"`
	Total int         `json:"total" dc:"筛选后的匹配总数" eg:"4"`
}

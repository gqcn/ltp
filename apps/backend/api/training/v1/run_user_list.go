// 本文件定义管理员指定运行用户的检索契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListRunUsersReq 检索可作为容器运行身份的平台 LDAP 用户。
type ListRunUsersReq struct {
	g.Meta   `path:"/training/run-users" method:"get" tags:"Training" summary:"检索运行用户" dc:"供本地管理员在提交任务时指定 LDAP 运行身份。仅返回已启用的平台 LDAP 用户。" permission:"training:job:create"`
	Keyword  string `json:"keyword" dc:"可选模糊匹配姓名、账号、邮箱或部门。" eg:"guoqiang"`
	PageNum  int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize int    `json:"pageSize" d:"20" v:"min:1|max:50" dc:"每页条数，最大 50。" eg:"20"`
}

// RunUserItem 是运行用户投影。
type RunUserItem struct {
	Id         int64  `json:"id" dc:"用户 ID" eg:"2"`
	Username   string `json:"username" dc:"登录账号" eg:"guoqiang"`
	Nickname   string `json:"nickname" dc:"显示名称" eg:"郭强"`
	Email      string `json:"email" dc:"邮箱" eg:"guoqiang@msxf.com"`
	Department string `json:"department" dc:"部门" eg:"人工智能中心 / SLM"`
}

// ListRunUsersRes 是运行用户分页列表。
type ListRunUsersRes struct {
	List  []*RunUserItem `json:"list" dc:"当前页用户"`
	Total int            `json:"total" dc:"筛选后总数" eg:"1"`
}

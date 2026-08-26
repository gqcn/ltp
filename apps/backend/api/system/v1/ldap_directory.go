// 本文件定义检索 LDAP 目录接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// SearchDirectoryReq 按关键词检索 LDAP 目录用户。
type SearchDirectoryReq struct {
	g.Meta  `path:"/system/ldap/directory" method:"get" tags:"System" summary:"检索 LDAP 目录" dc:"按当前 LDAP 配置检索公司目录。关键词为空时返回不超过上限的目录用户。已加入平台的账号会标记 alreadyAdded。单次最多返回 50 条。" permission:"platform:user:query"`
	Keyword string `json:"keyword" dc:"可选关键词，匹配账号、姓名、邮箱或部门。空表示不按关键词过滤。" eg:"sun"`
}

// DirectoryUser 是一条目录用户投影。
type DirectoryUser struct {
	Username     string `json:"username" dc:"账号" eg:"sunlei"`
	Name         string `json:"name" dc:"姓名" eg:"孙磊"`
	Email        string `json:"email" dc:"邮箱" eg:"sunlei@msxf.com"`
	Department   string `json:"department" dc:"部门" eg:"人工智能中心 / SLM"`
	Title        string `json:"title" dc:"职位" eg:"算法工程师"`
	AlreadyAdded bool   `json:"alreadyAdded" dc:"是否已在平台可用用户列表中" eg:"false"`
}

// SearchDirectoryRes 是目录检索结果。
type SearchDirectoryRes struct {
	List []*DirectoryUser `json:"list" dc:"目录用户列表，最多 50 条"`
}

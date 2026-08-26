// 本文件定义读取 LDAP 配置接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetLdapReq 读取当前平台 LDAP 配置。
type GetLdapReq struct {
	g.Meta `path:"/system/ldap" method:"get" tags:"System" summary:"获取 LDAP 配置" dc:"返回当前平台级 LDAP 连接配置。绑定密码不会出现在响应中，仅返回是否已设置。" permission:"platform:config:query"`
}

// LdapConfig 是对外 LDAP 配置投影。
type LdapConfig struct {
	Name            string `json:"name" dc:"配置名称" eg:"本地模拟 LDAP"`
	Host            string `json:"host" dc:"主机" eg:"127.0.0.1"`
	Port            int    `json:"port" dc:"端口" eg:"1389"`
	UseTls          bool   `json:"useTls" dc:"是否使用 LDAPS" eg:"false"`
	BaseDn          string `json:"baseDn" dc:"Base DN" eg:"dc=msxf,dc=com"`
	BindDn          string `json:"bindDn" dc:"Bind DN" eg:"cn=admin,dc=msxf,dc=com"`
	BindPasswordSet bool   `json:"bindPasswordSet" dc:"是否已保存绑定密码" eg:"true"`
	UserFilter      string `json:"userFilter" dc:"用户认证 Filter，{username} 替换为登录账号" eg:"(&(objectClass=inetOrgPerson)(uid={username}))"`
	SearchFilter    string `json:"searchFilter" dc:"目录搜索 Filter，{q} 替换为关键词" eg:"(|(uid=*{q}*)(cn=*{q}*)(mail=*{q}*))"`
	AttrUsername    string `json:"attrUsername" dc:"账号属性名" eg:"uid"`
	AttrName        string `json:"attrName" dc:"姓名属性名" eg:"cn"`
	AttrEmail       string `json:"attrEmail" dc:"邮箱属性名" eg:"mail"`
	AttrDepartment  string `json:"attrDepartment" dc:"部门属性名" eg:"ou"`
	AttrTitle       string `json:"attrTitle" dc:"职位属性名" eg:"title"`
	TimeoutSec      int    `json:"timeoutSec" dc:"超时秒数" eg:"10"`
	LastTestAt      int64  `json:"lastTestAt" dc:"最近测试时间，Unix 毫秒时间戳。尚未测试时为 0。" eg:"1754000000000"`
	LastTestResult  string `json:"lastTestResult" dc:"最近测试结果。success、fail 或空字符串表示尚未测试。" eg:"success"`
	LastTestMessage string `json:"lastTestMessage" dc:"最近测试说明" eg:"连接成功"`
	UpdatedBy       string `json:"updatedBy" dc:"最近保存者显示名" eg:"平台管理员"`
	UpdatedAt       int64  `json:"updatedAt" dc:"最近保存时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// GetLdapRes 返回当前 LDAP 配置。
type GetLdapRes struct {
	Config LdapConfig `json:"config" dc:"当前 LDAP 配置"`
}

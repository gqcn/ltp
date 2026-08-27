// 本文件定义保存 LDAP 配置接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateLdapReq 保存平台 LDAP 连接配置。
type UpdateLdapReq struct {
	g.Meta         `path:"/system/ldap" method:"put" tags:"System" summary:"保存 LDAP 配置" dc:"保存平台级 LDAP 连接参数。绑定密码留空表示不修改已保存密码。主机、端口、Base DN、Bind DN 必填。" permission:"platform:config:update"`
	Name           string `json:"name" v:"max-length:64#最长 64 个字符" dc:"配置名称" eg:"本地模拟 LDAP"`
	Host           string `json:"host" v:"required|max-length:64#请填写主机|最长 64 个字符" dc:"主机" eg:"127.0.0.1"`
	Port           int    `json:"port" v:"required|min:1|max:65535#请填写端口|端口范围为 1–65535|端口范围为 1–65535" dc:"端口" eg:"1389"`
	UseTls         bool   `json:"useTls" dc:"是否使用 LDAPS" eg:"false"`
	BaseDn         string `json:"baseDn" v:"required|max-length:64#请填写 Base DN|最长 64 个字符" dc:"Base DN" eg:"dc=msxf,dc=com"`
	BindDn         string `json:"bindDn" v:"required|max-length:64#请填写 Bind DN|最长 64 个字符" dc:"Bind DN" eg:"cn=admin,dc=msxf,dc=com"`
	BindPassword   string `json:"bindPassword" v:"max-length:64#最长 64 个字符" dc:"绑定密码。留空表示不修改已保存密码。" eg:""`
	UserFilter     string `json:"userFilter" v:"max-length:64#最长 64 个字符" dc:"用户认证 Filter。空则保留原值。" eg:"(&(objectClass=inetOrgPerson)(uid={username}))"`
	SearchFilter   string `json:"searchFilter" v:"max-length:64#最长 64 个字符" dc:"目录搜索 Filter。空则保留原值。" eg:"(|(uid=*{q}*)(cn=*{q}*)(mail=*{q}*))"`
	AttrUsername   string `json:"attrUsername" v:"max-length:64#最长 64 个字符" dc:"账号属性名。空则默认为 uid。" eg:"uid"`
	AttrName       string `json:"attrName" v:"max-length:64#最长 64 个字符" dc:"姓名属性名。空则默认为 cn。" eg:"cn"`
	AttrEmail      string `json:"attrEmail" v:"max-length:64#最长 64 个字符" dc:"邮箱属性名。空则默认为 mail。" eg:"mail"`
	AttrDepartment string `json:"attrDepartment" v:"max-length:64#最长 64 个字符" dc:"部门属性名。空则默认为 ou。" eg:"ou"`
	AttrTitle      string `json:"attrTitle" v:"max-length:64#最长 64 个字符" dc:"职位属性名。空则默认为 title。" eg:"title"`
	TimeoutSec     int    `json:"timeoutSec" dc:"超时秒数。省略或小于 1 时默认为 10，最大 120。" eg:"10"`
}

// UpdateLdapRes 返回保存后的配置。
type UpdateLdapRes struct {
	Config LdapConfig `json:"config" dc:"保存后的 LDAP 配置"`
}

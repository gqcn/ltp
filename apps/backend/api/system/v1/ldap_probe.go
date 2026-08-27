// 本文件定义测试 LDAP 连接接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// TestLdapReq 使用表单参数测试 LDAP 连接。
type TestLdapReq struct {
	g.Meta         `path:"/system/ldap/tests" method:"post" tags:"System" summary:"测试 LDAP 连接" dc:"使用当前表单参数绑定并检索 Base DN。密码留空时使用已保存密码。测试结果会写入配置记录。" permission:"platform:config:update"`
	Name           string `json:"name" v:"max-length:64#最长 64 个字符" dc:"配置名称" eg:"本地模拟 LDAP"`
	Host           string `json:"host" v:"required|max-length:64#请填写主机|最长 64 个字符" dc:"主机" eg:"127.0.0.1"`
	Port           int    `json:"port" v:"required|min:1|max:65535#请填写端口|端口范围为 1–65535|端口范围为 1–65535" dc:"端口" eg:"1389"`
	UseTls         bool   `json:"useTls" dc:"是否使用 LDAPS" eg:"false"`
	BaseDn         string `json:"baseDn" v:"required|max-length:64#请填写 Base DN|最长 64 个字符" dc:"Base DN" eg:"dc=msxf,dc=com"`
	BindDn         string `json:"bindDn" v:"required|max-length:64#请填写 Bind DN|最长 64 个字符" dc:"Bind DN" eg:"cn=admin,dc=msxf,dc=com"`
	BindPassword   string `json:"bindPassword" v:"max-length:64#最长 64 个字符" dc:"绑定密码。留空表示使用已保存密码。" eg:""`
	UserFilter     string `json:"userFilter" v:"max-length:64#最长 64 个字符" dc:"用户认证 Filter" eg:"(&(objectClass=inetOrgPerson)(uid={username}))"`
	SearchFilter   string `json:"searchFilter" v:"max-length:64#最长 64 个字符" dc:"目录搜索 Filter" eg:"(|(uid=*{q}*)(cn=*{q}*)(mail=*{q}*))"`
	AttrUsername   string `json:"attrUsername" v:"max-length:64#最长 64 个字符" dc:"账号属性名" eg:"uid"`
	AttrName       string `json:"attrName" v:"max-length:64#最长 64 个字符" dc:"姓名属性名" eg:"cn"`
	AttrEmail      string `json:"attrEmail" v:"max-length:64#最长 64 个字符" dc:"邮箱属性名" eg:"mail"`
	AttrDepartment string `json:"attrDepartment" v:"max-length:64#最长 64 个字符" dc:"部门属性名" eg:"ou"`
	AttrTitle      string `json:"attrTitle" v:"max-length:64#最长 64 个字符" dc:"职位属性名" eg:"title"`
	TimeoutSec     int    `json:"timeoutSec" dc:"超时秒数" eg:"10"`
}

// TestLdapRes 返回测试结果。
type TestLdapRes struct {
	Ok      bool       `json:"ok" dc:"是否连接成功" eg:"true"`
	Message string     `json:"message" dc:"测试说明" eg:"连接成功"`
	Config  LdapConfig `json:"config" dc:"写入测试结果后的当前配置投影"`
}

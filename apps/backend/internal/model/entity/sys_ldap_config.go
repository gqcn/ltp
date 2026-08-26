// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// SysLdapConfig is the golang structure for table sys_ldap_config.
type SysLdapConfig struct {
	Id              int64       `json:"id"              orm:"id"                description:"配置 ID"`
	Code            string      `json:"code"            orm:"code"              description:"业务键，固定为 default"`
	Name            string      `json:"name"            orm:"name"              description:"配置名称"`
	Host            string      `json:"host"            orm:"host"              description:"LDAP 主机"`
	Port            int         `json:"port"            orm:"port"              description:"LDAP 端口"`
	UseTls          bool        `json:"useTls"          orm:"use_tls"           description:"是否使用 LDAPS"`
	BaseDn          string      `json:"baseDn"          orm:"base_dn"           description:"检索 Base DN"`
	BindDn          string      `json:"bindDn"          orm:"bind_dn"           description:"服务账号 Bind DN"`
	BindPassword    string      `json:"bindPassword"    orm:"bind_password"     description:"服务账号绑定密码，接口响应不得返回明文"`
	UserFilter      string      `json:"userFilter"      orm:"user_filter"       description:"用户认证 Filter，{username} 替换为登录账号"`
	SearchFilter    string      `json:"searchFilter"    orm:"search_filter"     description:"目录搜索 Filter，{q} 替换为关键词"`
	AttrUsername    string      `json:"attrUsername"    orm:"attr_username"     description:"账号属性名"`
	AttrName        string      `json:"attrName"        orm:"attr_name"         description:"姓名属性名"`
	AttrEmail       string      `json:"attrEmail"       orm:"attr_email"        description:"邮箱属性名"`
	AttrDepartment  string      `json:"attrDepartment"  orm:"attr_department"   description:"部门属性名"`
	AttrTitle       string      `json:"attrTitle"       orm:"attr_title"        description:"职位属性名"`
	TimeoutSec      int         `json:"timeoutSec"      orm:"timeout_sec"       description:"连接超时秒数"`
	LastTestAt      *gtime.Time `json:"lastTestAt"      orm:"last_test_at"      description:"最近一次测试时间"`
	LastTestResult  string      `json:"lastTestResult"  orm:"last_test_result"  description:"最近测试结果：success / fail，空表示尚未测试"`
	LastTestMessage string      `json:"lastTestMessage" orm:"last_test_message" description:"最近测试说明"`
	UpdatedBy       string      `json:"updatedBy"       orm:"updated_by"        description:"最近保存者显示名"`
	CreatedAt       *gtime.Time `json:"createdAt"       orm:"created_at"        description:"创建时间"`
	UpdatedAt       *gtime.Time `json:"updatedAt"       orm:"updated_at"        description:"更新时间"`
}

// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// SysLdapConfig is the golang structure of table sys_ldap_config for DAO operations like Where/Data.
type SysLdapConfig struct {
	g.Meta          `orm:"table:sys_ldap_config, do:true"`
	Id              any         // 配置 ID
	Code            any         // 业务键，固定为 default
	Name            any         // 配置名称
	Host            any         // LDAP 主机
	Port            any         // LDAP 端口
	UseTls          any         // 是否使用 LDAPS
	BaseDn          any         // 检索 Base DN
	BindDn          any         // 服务账号 Bind DN
	BindPassword    any         // 服务账号绑定密码，接口响应不得返回明文
	UserFilter      any         // 用户认证 Filter，{username} 替换为登录账号
	SearchFilter    any         // 目录搜索 Filter，{q} 替换为关键词
	AttrUsername    any         // 账号属性名
	AttrName        any         // 姓名属性名
	AttrEmail       any         // 邮箱属性名
	AttrDepartment  any         // 部门属性名
	AttrTitle       any         // 职位属性名
	TimeoutSec      any         // 连接超时秒数
	LastTestAt      *gtime.Time // 最近一次测试时间
	LastTestResult  any         // 最近测试结果：success / fail，空表示尚未测试
	LastTestMessage any         // 最近测试说明
	UpdatedBy       any         // 最近保存者显示名
	CreatedAt       *gtime.Time // 创建时间
	UpdatedAt       *gtime.Time // 更新时间
}

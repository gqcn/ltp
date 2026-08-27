// 本文件定义创建服务端会话的登录接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// LoginReq 使用用户名和密码创建服务端会话。
type LoginReq struct {
	g.Meta   `path:"/auth/sessions" method:"post" tags:"Authentication" summary:"登录" dc:"按登录方式认证。mode=admin 校验本地管理员密码哈希；mode=ldap 要求账号已加入平台可用用户且启用，再对当前 LDAP 配置执行用户绑定。成功后创建服务端会话并设置 HttpOnly 会话 Cookie。"`
	Mode     string `json:"mode" v:"required|in:admin,ldap#请选择登录方式|登录方式无效" dc:"登录方式。admin 为平台管理员入口，ldap 为企业目录入口。" eg:"admin"`
	Username string `json:"username" v:"required|max-length:64#请填写用户名|最长 64 个字符" dc:"登录用户名或域账号" eg:"admin"`
	Password string `json:"password" v:"required|max-length:64#请填写密码|最长 64 个字符" dc:"登录密码。管理员为本地密码，LDAP 用户为目录密码。" eg:"admin123"`
}

// LoginRes 在登录成功后返回已认证用户。
type LoginRes struct {
	User SessionUser `json:"user" dc:"已认证用户资料"`
}

// Package consts 存放非模块枚举的全局常量。业务枚举应放在所属服务包内。
package consts

const (
	// LabelKeyDatacenter 是数据中心绑定使用的固定 Kubernetes 标签键。
	LabelKeyDatacenter = "maip.io/datacenter"
	// DefaultDatacenterCode 是内置数据中心的保留业务标识。
	DefaultDatacenterCode = "default"
	// CookieNameDefault 是默认会话 Cookie 名。
	CookieNameDefault = "ltp_session"
)

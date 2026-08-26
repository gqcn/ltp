// =================================================================================
// 本文件由 GoFrame CLI 自动生成，可按需修改。
// =================================================================================

package dao

import (
	"github.com/gqcn/ltp/internal/dao/internal"
)

// sysUserSessionDao 是表 sys_user_session 的数据访问对象。
// 可按需在此定义自定义方法以扩展能力。
type sysUserSessionDao struct {
	*internal.SysUserSessionDao
}

var (
	// SysUserSession 是表 sys_user_session 的全局访问对象。
	SysUserSession = sysUserSessionDao{internal.NewSysUserSessionDao()}
)

// 在下方添加自定义方法与能力。

// =================================================================================
// 本文件由 GoFrame CLI 自动生成，可按需修改。
// =================================================================================

package dao

import (
	"github.com/gqcn/ltp/internal/dao/internal"
)

// sysUserDao 是表 sys_user 的数据访问对象。
// 可按需在此定义自定义方法以扩展能力。
type sysUserDao struct {
	*internal.SysUserDao
}

var (
	// SysUser 是表 sys_user 的全局访问对象。
	SysUser = sysUserDao{internal.NewSysUserDao()}
)

// 在下方添加自定义方法与能力。

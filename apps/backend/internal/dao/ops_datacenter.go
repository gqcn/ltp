// =================================================================================
// 本文件由 GoFrame CLI 自动生成，可按需修改。
// =================================================================================

package dao

import (
	"github.com/gqcn/ltp/internal/dao/internal"
)

// opsDatacenterDao 是表 ops_datacenter 的数据访问对象。
// 可按需在此定义自定义方法以扩展能力。
type opsDatacenterDao struct {
	*internal.OpsDatacenterDao
}

var (
	// OpsDatacenter 是表 ops_datacenter 的全局访问对象。
	OpsDatacenter = opsDatacenterDao{internal.NewOpsDatacenterDao()}
)

// 在下方添加自定义方法与能力。

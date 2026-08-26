// 本文件将内部时间转换为公开 API 的 Unix 毫秒时间戳。

package model

import "github.com/gogf/gf/v2/os/gtime"

// UnixMilli 返回 Unix 毫秒时间戳。零值或空时间返回 0。
func UnixMilli(t *gtime.Time) int64 {
	if t == nil || t.IsZero() {
		return 0
	}
	return t.TimestampMilli()
}

// 本文件定义模板渲染使用的运行时消息参数。

package bizerr

import "strings"

// Param 是渲染消息模板时的一个命名参数。
type Param struct {
	Name  string
	Value any
}

// P 构造一个命名的运行时消息参数。
func P(name string, value any) Param {
	return Param{Name: strings.TrimSpace(name), Value: value}
}

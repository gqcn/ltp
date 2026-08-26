// 本文件实现业务错误兜底模板渲染。

package bizerr

import (
	"fmt"
	"strings"
)

// Format 通过替换 `{name}` 占位符渲染消息模板。
func Format(template string, params map[string]any) string {
	rendered := template
	for key, value := range params {
		placeholder := "{" + key + "}"
		rendered = strings.ReplaceAll(rendered, placeholder, fmt.Sprint(value))
	}
	return rendered
}

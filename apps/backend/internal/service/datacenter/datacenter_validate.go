// 本文件校验数据中心标识、颜色和必填文本。

package datacenter

import (
	"regexp"
	"strings"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

var (
	codePattern  = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)
	colorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
)

func normalizeName(name string) string {
	return strings.TrimSpace(name)
}

func normalizeCode(code string) string {
	return strings.TrimSpace(code)
}

func normalizeColor(color string) string {
	color = strings.TrimSpace(color)
	if color == "" || !colorPattern.MatchString(color) {
		return defaultColor
	}
	return color
}

func validateCode(code string) error {
	if code == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写数据中心标识"))
	}
	if !codePattern.MatchString(code) {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "数据中心标识仅支持小写字母、数字与连字符，且不能以连字符开头或结尾"))
	}
	return nil
}

func validateRequiredText(code string, name string, shortName string) error {
	if strings.TrimSpace(code) == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写数据中心标识"))
	}
	if strings.TrimSpace(name) == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写显示名称"))
	}
	if strings.TrimSpace(shortName) == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写简称"))
	}
	return nil
}

func buildLabel(code string) string {
	return consts.LabelKeyDatacenter + "=" + code
}

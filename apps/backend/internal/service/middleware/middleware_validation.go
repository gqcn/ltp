// 本文件把 GoFrame 默认英文校验文案转成中文，避免表单提交失败时把字段名原文返回给控制台。

package middleware

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	reRequired  = regexp.MustCompile(`(?i)^The (.+) field is required$`)                                    // 必填
	reMaxLength = regexp.MustCompile(`(?i)^The (.+) value .+ length must be equal or lesser than (\d+)$`)   // 最大长度
	reMinLength = regexp.MustCompile(`(?i)^The (.+) field min length must be equal or greater than (\d+)$`) // 最小长度
	reMin       = regexp.MustCompile(`(?i)^The (.+) value .+ must be equal or greater than (.+)$`)          // 最小值
	reMax       = regexp.MustCompile(`(?i)^The (.+) value .+ must be equal or lesser than (.+)$`)           // 最大值
	reIn        = regexp.MustCompile(`(?i)^The (.+) value .+ must be in .+`)                                // 枚举
)

// validationFieldLabels 把 GoFrame 校验字段名映射为控制台中文标签。
var validationFieldLabels = map[string]string{
	"Username":       "用户名",
	"username":       "用户名",
	"Password":       "密码",
	"password":       "密码",
	"Mode":           "登录方式",
	"mode":           "登录方式",
	"DisplayName":    "显示名称",
	"displayName":    "显示名称",
	"Kubeconfig":     "Kubeconfig",
	"kubeconfig":     "Kubeconfig",
	"Name":           "名称",
	"name":           "名称",
	"Code":           "标识",
	"code":           "标识",
	"ShortName":      "简称",
	"shortName":      "简称",
	"Host":           "主机",
	"host":           "主机",
	"Port":           "端口",
	"port":           "端口",
	"BaseDn":         "Base DN",
	"baseDn":         "Base DN",
	"BindDn":         "Bind DN",
	"bindDn":         "Bind DN",
	"DatacenterCode": "数据中心",
	"datacenterCode": "数据中心",
	"GpuType":        "GPU 型号",
	"gpuType":        "GPU 型号",
	"TeamIds":        "关联团队",
	"teamIds":        "关联团队",
	"OwnerUserId":    "负责人",
	"ownerUserId":    "负责人",
	"RoleCode":       "角色",
	"roleCode":       "角色",
	"Usernames":      "用户",
	"usernames":      "用户",
	"Status":         "状态",
	"status":         "状态",
	"Remark":         "备注",
	"remark":         "备注",
}

// localizeValidationMessage 将 GoFrame 默认英文校验句翻译为中文；已是中文的原文保持不变。
func localizeValidationMessage(message string) string {
	message = strings.TrimSpace(message)
	if message == "" || !strings.HasPrefix(message, "The ") {
		return message
	}
	parts := strings.Split(message, "; ")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, translateValidationPart(part))
	}
	if len(out) == 0 {
		return message
	}
	return strings.Join(out, "；")
}

// translateValidationPart 翻译单条 GoFrame 英文校验句。
func translateValidationPart(part string) string {
	if m := reRequired.FindStringSubmatch(part); len(m) == 2 {
		return requiredMessage(m[1])
	}
	if m := reMaxLength.FindStringSubmatch(part); len(m) == 3 {
		return fieldLabel(m[1]) + "最长 " + m[2] + " 个字符"
	}
	if m := reMinLength.FindStringSubmatch(part); len(m) == 3 {
		return fieldLabel(m[1]) + "至少 " + m[2] + " 项"
	}
	if m := reMin.FindStringSubmatch(part); len(m) == 3 {
		return fieldLabel(m[1]) + "不能小于 " + m[2]
	}
	if m := reMax.FindStringSubmatch(part); len(m) == 3 {
		return fieldLabel(m[1]) + "不能大于 " + m[2]
	}
	if m := reIn.FindStringSubmatch(part); len(m) == 2 {
		return fieldLabel(m[1]) + "取值无效"
	}
	return part
}

// requiredMessage 生成「请填写」类中文必填提示。
func requiredMessage(field string) string {
	label := fieldLabel(field)
	if label == "" {
		return "请填写必填项"
	}
	runes := []rune(label)
	if unicode.Is(unicode.Latin, runes[0]) {
		return "请填写 " + label
	}
	return "请填写" + label
}

// fieldLabel 返回字段的中文标签，未知字段保留原名。
func fieldLabel(field string) string {
	field = strings.TrimSpace(field)
	if label, ok := validationFieldLabels[field]; ok {
		return label
	}
	return field
}

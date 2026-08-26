// 本文件定义可复用业务错误码及元数据访问。

package bizerr

import (
	"strings"

	"github.com/gogf/gf/v2/errors/gcode"
)

// Meta 携带一条业务错误定义的运行时元数据。
type Meta struct {
	ErrorCode string     // ErrorCode is the stable machine-readable business code.
	Fallback  string     // Fallback is the user-facing message template.
	TypeCode  gcode.Code // TypeCode is the GoFrame semantic category.
}

// Code 定义一条可复用业务错误。
type Code struct {
	meta Meta
}

// MustDefine 创建一条可复用业务错误定义。
func MustDefine(errorCode string, fallback string, typeCode gcode.Code) *Code {
	meta := Meta{
		ErrorCode: strings.TrimSpace(errorCode),
		Fallback:  strings.TrimSpace(fallback),
		TypeCode:  typeCode,
	}
	if meta.ErrorCode == "" {
		panic("bizerr error code is required")
	}
	if meta.Fallback == "" {
		panic("bizerr fallback is required")
	}
	if meta.TypeCode == nil || meta.TypeCode == gcode.CodeNil {
		meta.TypeCode = gcode.CodeUnknown
	}
	return &Code{meta: meta}
}

// Metadata 从可复用错误定义中提取元数据。
func Metadata(code *Code) (Meta, bool) {
	if code == nil {
		return Meta{}, false
	}
	return code.meta, true
}

// TypeCode 返回该业务错误的 GoFrame 语义分类。
func (c *Code) TypeCode() gcode.Code {
	if c == nil || c.meta.TypeCode == nil || c.meta.TypeCode == gcode.CodeNil {
		return gcode.CodeUnknown
	}
	return c.meta.TypeCode
}

// RuntimeCode 返回稳定的机器可读业务错误码。
func (c *Code) RuntimeCode() string {
	if c == nil {
		return ""
	}
	return c.meta.ErrorCode
}

// Fallback 返回该错误定义的消息模板。
func (c *Code) Fallback() string {
	if c == nil {
		return ""
	}
	return c.meta.Fallback
}

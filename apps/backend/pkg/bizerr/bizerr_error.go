// 本文件实现结构化业务错误的构造与匹配。

package bizerr

import (
	"errors"

	"github.com/gogf/gf/v2/errors/gcode"
	"github.com/gogf/gf/v2/errors/gerror"
)

// Error 携带业务元数据，堆栈与 cause 交给 gerror。
type Error struct {
	err    error
	meta   Meta
	params map[string]any
}

// New 按预定义错误构造结构化业务错误。
func New(code *Code, params ...Param) error {
	return newError(nil, code, params...)
}

// Wrap 构造包装底层 cause 的结构化业务错误。
func Wrap(cause error, code *Code, params ...Param) error {
	if cause == nil {
		return nil
	}
	return newError(cause, code, params...)
}

// As 从错误链中提取结构化业务错误。
func As(err error) (*Error, bool) {
	var target *Error
	if errors.As(err, &target) {
		return target, true
	}
	return nil, false
}

// Is 报告 err 是否携带给定的结构化业务错误码。
func Is(err error, code *Code) bool {
	messageErr, ok := As(err)
	if !ok {
		return false
	}
	return messageErr.Matches(code)
}

// Error 返回渲染后的兜底文案。
func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	if e.err != nil {
		return e.err.Error()
	}
	return Format(e.Fallback(), e.params)
}

// Unwrap 返回携带堆栈和可选 cause 的 GoFrame 错误。
func (e *Error) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.err
}

// Code 返回该错误携带的 GoFrame 类型码。
func (e *Error) Code() gcode.Code {
	return e.TypeCode()
}

// TypeCode 返回该业务错误的 GoFrame 语义分类。
func (e *Error) TypeCode() gcode.Code {
	if e == nil || e.meta.TypeCode == nil || e.meta.TypeCode == gcode.CodeNil {
		return gcode.CodeUnknown
	}
	return e.meta.TypeCode
}

// RuntimeCode 返回稳定的机器可读业务错误码。
func (e *Error) RuntimeCode() string {
	if e == nil {
		return ""
	}
	return e.meta.ErrorCode
}

// Fallback 返回该错误的源兜底文案。
func (e *Error) Fallback() string {
	if e == nil {
		return ""
	}
	return e.meta.Fallback
}

// Matches 报告该结构化错误是否由指定错误码创建。
func (e *Error) Matches(code *Code) bool {
	if e == nil || code == nil {
		return false
	}
	return e.RuntimeCode() != "" && e.RuntimeCode() == code.RuntimeCode()
}

func newError(cause error, code *Code, params ...Param) *Error {
	meta, ok := Metadata(code)
	if !ok {
		meta = Meta{
			Fallback: "Unknown error",
			TypeCode: gcode.CodeUnknown,
		}
	}
	normalizedParams := make(map[string]any, len(params))
	for _, item := range params {
		if item.Name == "" {
			continue
		}
		normalizedParams[item.Name] = item.Value
	}
	message := Format(meta.Fallback, normalizedParams)
	var err error
	if cause == nil {
		err = gerror.NewCodeSkip(meta.TypeCode, 2, message)
	} else {
		err = gerror.WrapCodeSkip(meta.TypeCode, 2, cause, message)
	}
	return &Error{
		err:    err,
		meta:   meta,
		params: normalizedParams,
	}
}

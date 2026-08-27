// 本文件写出统一 JSON 响应信封。

package middleware

import (
	"net/http"

	"github.com/gogf/gf/v2/errors/gcode"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/net/ghttp"

	"github.com/gqcn/ltp/pkg/bizerr"
)

// Response 在处理函数返回后序列化统一 JSON 载荷。
func (s *serviceImpl) Response(r *ghttp.Request) {
	if r == nil {
		return
	}
	r.Middleware.Next()
	if r.Response.BufferLength() > 0 || r.Response.BytesWritten() > 0 {
		return
	}
	if r.Response.Status == http.StatusNotModified || r.Response.Status == http.StatusNoContent {
		return
	}

	err := r.GetError()
	res := r.GetHandlerResponse()
	if err == nil {
		r.Response.WriteJson(HandlerResponse{
			Code:    gcode.CodeOK.Code(),
			Message: "OK",
			Data:    res,
		})
		return
	}

	code := gerror.Code(err)
	if code == gcode.CodeNil {
		code = gcode.CodeInternalError
	}
	payload := HandlerResponse{
		Code:    code.Code(),
		Message: localizeValidationMessage(err.Error()),
		Data:    nil,
	}
	if messageErr, ok := bizerr.As(err); ok {
		payload.ErrorCode = messageErr.RuntimeCode()
		payload.Message = messageErr.Error()
		payload.Code = messageErr.TypeCode().Code()
	}
	r.Response.WriteJson(payload)
}

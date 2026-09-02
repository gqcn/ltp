// 本文件实现打开实验 TensorBoard。

package training

import (
	"context"
	"strconv"
	"strings"

	"github.com/gogf/gf/v2/net/ghttp"
	v1 "github.com/gqcn/ltp/api/training/v1"
)

// OpenExperimentBoard 确保看板并返回反代前缀。
func (c *ControllerV1) OpenExperimentBoard(ctx context.Context, req *v1.OpenExperimentBoardReq) (*v1.OpenExperimentBoardRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.runSvc.OpenBoard(ctx, runActor, req.Id)
	if err != nil {
		return nil, err
	}
	return &v1.OpenExperimentBoardRes{ProxyPath: out.ProxyPath, Ready: out.Ready, Message: out.Message}, nil
}

// ProxyBoard 将会话请求反代到机房 TensorBoard。
func (c *ControllerV1) ProxyBoard(r *ghttp.Request) {
	_, runActor, err := c.expActor(r.Context())
	if err != nil {
		r.SetError(err)
		return
	}
	id, path := parseBoardURL(r.URL.Path)
	if id <= 0 {
		r.Response.WriteStatus(404)
		return
	}
	status, body, header, err := c.runSvc.ProxyBoard(r.Context(), runActor, id, r.Method, path, r.Request.URL.RawQuery, map[string]string{}, r.GetBody())
	if err != nil {
		r.SetError(err)
		return
	}
	for k, v := range header {
		r.Response.Header().Set(k, v)
	}
	if status <= 0 {
		status = 200
	}
	r.Response.WriteHeader(status)
	if len(body) > 0 {
		r.Response.Write(body)
	}
}

// parseBoardURL 从 /api/training/experiments/{id}/board/... 解析 Run ID 与剩余路径。
func parseBoardURL(urlPath string) (int64, string) {
	const marker = "/training/experiments/"
	idx := strings.Index(urlPath, marker)
	if idx < 0 {
		return 0, ""
	}
	rest := urlPath[idx+len(marker):]
	idStr, after, ok := strings.Cut(rest, "/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, ""
	}
	if !ok {
		return id, ""
	}
	after = strings.TrimPrefix(after, "board")
	after = strings.TrimPrefix(after, "/")
	return id, after
}

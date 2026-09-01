// 本文件实现打开实验 TensorBoard。

package training

import (
	"context"

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
	id := r.Get("id").Int64()
	path := r.Get("path").String()
	status, body, err := c.runSvc.ProxyBoard(r.Context(), runActor, id, r.Method, path, r.Request.URL.RawQuery, map[string]string{}, r.GetBody())
	if err != nil {
		r.SetError(err)
		return
	}
	r.Response.WriteStatus(status)
	r.Response.Write(body)
}

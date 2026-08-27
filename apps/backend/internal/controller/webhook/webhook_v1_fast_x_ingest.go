// 本文件实现 FastX 告警 Webhook。

package webhook

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/frame/g"

	v1 "github.com/gqcn/ltp/api/webhook/v1"
	alertsvc "github.com/gqcn/ltp/internal/service/alert"
)

// FastXIngest 接收 FastX 推送并入库。
func (c *ControllerV1) FastXIngest(ctx context.Context, req *v1.FastXIngestReq) (res *v1.FastXIngestRes, err error) {
	r := g.RequestFromCtx(ctx)
	token := strings.TrimSpace(req.Token)
	if token == "" && r != nil {
		token = strings.TrimSpace(r.Header.Get("X-Fastx-Token"))
	}
	if token == "" && r != nil {
		token = strings.TrimSpace(r.Get("token").String())
	}
	payload := []byte{}
	if r != nil {
		payload = r.GetBody()
	}
	id, err := c.alertSvc.Ingest(ctx, alertsvc.IngestInput{Token: token, Payload: payload})
	if err != nil {
		return nil, err
	}
	return &v1.FastXIngestRes{Id: id}, nil
}

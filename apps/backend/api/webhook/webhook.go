// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package webhook

import (
	"context"

	"github.com/gqcn/ltp/api/webhook/v1"
)

type IWebhookV1 interface {
	FastXIngest(ctx context.Context, req *v1.FastXIngestReq) (res *v1.FastXIngestRes, err error)
}

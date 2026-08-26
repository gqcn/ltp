// =================================================================================
// 由 GoFrame CLI 生成并维护，请勿手工修改。
// =================================================================================

package health

import (
	"context"

	"github.com/gqcn/ltp/api/health/v1"
)

type IHealthV1 interface {
	Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error)
}

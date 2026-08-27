// =================================================================================
// 由 GoFrame CLI 生成并维护，请勿手工修改。
// =================================================================================

package datacenter

import (
	"context"

	"github.com/gqcn/ltp/api/datacenter/v1"
)

type IDatacenterV1 interface {
	Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error)
	Delete(ctx context.Context, req *v1.DeleteReq) (res *v1.DeleteRes, err error)
	Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error)
	List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error)
	Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error)
}

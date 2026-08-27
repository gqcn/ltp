// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package alert

import (
	"context"

	"github.com/gqcn/ltp/api/alert/v1"
)

type IAlertV1 interface {
	Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error)
	UpdateStatus(ctx context.Context, req *v1.UpdateStatusReq) (res *v1.UpdateStatusRes, err error)
	BatchUpdateStatus(ctx context.Context, req *v1.BatchUpdateStatusReq) (res *v1.BatchUpdateStatusRes, err error)
	List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error)
	Summary(ctx context.Context, req *v1.SummaryReq) (res *v1.SummaryRes, err error)
}

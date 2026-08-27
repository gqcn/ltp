// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package node

import (
	"context"

	"github.com/gqcn/ltp/api/node/v1"
)

type INodeV1 interface {
	EventList(ctx context.Context, req *v1.EventListReq) (res *v1.EventListRes, err error)
	List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error)
	AssignDatacenter(ctx context.Context, req *v1.AssignDatacenterReq) (res *v1.AssignDatacenterRes, err error)
	UpdateLabels(ctx context.Context, req *v1.UpdateLabelsReq) (res *v1.UpdateLabelsRes, err error)
	UpdateTaints(ctx context.Context, req *v1.UpdateTaintsReq) (res *v1.UpdateTaintsRes, err error)
	Isolate(ctx context.Context, req *v1.IsolateReq) (res *v1.IsolateRes, err error)
	Recover(ctx context.Context, req *v1.RecoverReq) (res *v1.RecoverRes, err error)
}

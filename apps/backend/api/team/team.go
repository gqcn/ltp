// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package team

import (
	"context"

	"github.com/gqcn/ltp/api/team/v1"
)

type ITeamV1 interface {
	Create(ctx context.Context, req *v1.CreateReq) (res *v1.CreateRes, err error)
	Get(ctx context.Context, req *v1.GetReq) (res *v1.GetRes, err error)
	List(ctx context.Context, req *v1.ListReq) (res *v1.ListRes, err error)
	AddMember(ctx context.Context, req *v1.AddMemberReq) (res *v1.AddMemberRes, err error)
	RemoveMember(ctx context.Context, req *v1.RemoveMemberReq) (res *v1.RemoveMemberRes, err error)
	Update(ctx context.Context, req *v1.UpdateReq) (res *v1.UpdateRes, err error)
}

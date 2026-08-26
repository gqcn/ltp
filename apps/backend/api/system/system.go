// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package system

import (
	"context"

	"github.com/gqcn/ltp/api/system/v1"
)

type ISystemV1 interface {
	SearchDirectory(ctx context.Context, req *v1.SearchDirectoryReq) (res *v1.SearchDirectoryRes, err error)
	GetLdap(ctx context.Context, req *v1.GetLdapReq) (res *v1.GetLdapRes, err error)
	TestLdap(ctx context.Context, req *v1.TestLdapReq) (res *v1.TestLdapRes, err error)
	UpdateLdap(ctx context.Context, req *v1.UpdateLdapReq) (res *v1.UpdateLdapRes, err error)
}

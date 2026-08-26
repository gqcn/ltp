// 本文件测试 LDAP 连接。

package system

import (
	"context"

	v1 "github.com/gqcn/ltp/api/system/v1"
	ldapsvc "github.com/gqcn/ltp/internal/service/ldap"
)

// TestLdap 使用表单参数探测 LDAP 连接。
func (c *ControllerV1) TestLdap(ctx context.Context, req *v1.TestLdapReq) (res *v1.TestLdapRes, err error) {
	updatedBy := ""
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		updatedBy = ident.Nickname
	}
	out, err := c.ldapSvc.TestConfig(ctx, ldapsvc.SaveInput{
		Name:           req.Name,
		Host:           req.Host,
		Port:           req.Port,
		UseTLS:         req.UseTls,
		BaseDN:         req.BaseDn,
		BindDN:         req.BindDn,
		BindPassword:   req.BindPassword,
		UserFilter:     req.UserFilter,
		SearchFilter:   req.SearchFilter,
		AttrUsername:   req.AttrUsername,
		AttrName:       req.AttrName,
		AttrEmail:      req.AttrEmail,
		AttrDepartment: req.AttrDepartment,
		AttrTitle:      req.AttrTitle,
		TimeoutSec:     req.TimeoutSec,
		UpdatedBy:      updatedBy,
	})
	if err != nil {
		return nil, err
	}
	return &v1.TestLdapRes{
		Ok:      out.OK,
		Message: out.Message,
		Config:  toLdapConfig(out.Config),
	}, nil
}

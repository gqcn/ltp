// 本文件保存 LDAP 配置。

package system

import (
	"context"

	v1 "github.com/gqcn/ltp/api/system/v1"
	ldapsvc "github.com/gqcn/ltp/internal/service/ldap"
)

// UpdateLdap 保存平台 LDAP 连接参数。
func (c *ControllerV1) UpdateLdap(ctx context.Context, req *v1.UpdateLdapReq) (res *v1.UpdateLdapRes, err error) {
	updatedBy := ""
	if ident := c.bizCtxSvc.Get(ctx); ident != nil {
		updatedBy = ident.Nickname
	}
	view, err := c.ldapSvc.SaveConfig(ctx, ldapsvc.SaveInput{
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
	return &v1.UpdateLdapRes{Config: toLdapConfig(view)}, nil
}

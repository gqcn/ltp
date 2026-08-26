// 本文件读取当前 LDAP 配置。

package system

import (
	"context"

	v1 "github.com/gqcn/ltp/api/system/v1"
)

// GetLdap 返回当前平台 LDAP 配置。
func (c *ControllerV1) GetLdap(ctx context.Context, _ *v1.GetLdapReq) (res *v1.GetLdapRes, err error) {
	view, err := c.ldapSvc.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &v1.GetLdapRes{Config: toLdapConfig(view)}, nil
}

// 本文件将 LDAP 服务投影映射为公开 API DTO。

package system

import (
	v1 "github.com/gqcn/ltp/api/system/v1"
	ldapsvc "github.com/gqcn/ltp/internal/service/ldap"
)

func toLdapConfig(view *ldapsvc.View) v1.LdapConfig {
	if view == nil {
		return v1.LdapConfig{}
	}
	return v1.LdapConfig{
		Name:            view.Name,
		Host:            view.Host,
		Port:            view.Port,
		UseTls:          view.UseTLS,
		BaseDn:          view.BaseDN,
		BindDn:          view.BindDN,
		BindPasswordSet: view.BindPasswordSet,
		UserFilter:      view.UserFilter,
		SearchFilter:    view.SearchFilter,
		AttrUsername:    view.AttrUsername,
		AttrName:        view.AttrName,
		AttrEmail:       view.AttrEmail,
		AttrDepartment:  view.AttrDepartment,
		AttrTitle:       view.AttrTitle,
		TimeoutSec:      view.TimeoutSec,
		LastTestAt:      view.LastTestAt,
		LastTestResult:  string(view.LastTestResult),
		LastTestMessage: view.LastTestMessage,
		UpdatedBy:       view.UpdatedBy,
		UpdatedAt:       view.UpdatedAt,
	}
}

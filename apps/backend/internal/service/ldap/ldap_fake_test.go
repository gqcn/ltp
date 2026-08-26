// 本文件提供 LDAP Directory 测试替身。

package ldap

import "context"

type fakeDirectory struct {
	pingErr error   // Ping 返回错误
	bindErr error   // BindUser 返回错误
	entries []Entry // 检索结果
	searchQ string  // 最近一次检索过滤器
}

func (f *fakeDirectory) Ping(_ context.Context, _ Config) error {
	return f.pingErr
}

func (f *fakeDirectory) BindUser(_ context.Context, _ Config, _ string, _ string) error {
	return f.bindErr
}

func (f *fakeDirectory) Search(_ context.Context, _ Config, filter string, _ int) ([]Entry, error) {
	f.searchQ = filter
	return append([]Entry{}, f.entries...), nil
}

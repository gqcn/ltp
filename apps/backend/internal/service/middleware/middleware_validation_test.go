// 本文件验证英文校验句会被翻译成中文。

package middleware

import "testing"

func TestLocalizeValidationMessage(t *testing.T) {
	t.Parallel()
	cases := []struct {
		in   string
		want string
	}{
		{in: "请填写显示名称", want: "请填写显示名称"},
		{in: "The DisplayName field is required", want: "请填写显示名称"},
		{in: "The Username field is required", want: "请填写用户名"},
		{in: "The Host field is required; The BaseDn field is required", want: "请填写主机；请填写 Base DN"},
		{in: "The Name value `abc` length must be equal or lesser than 32", want: "名称最长 32 个字符"},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.in, func(t *testing.T) {
			t.Parallel()
			if got := localizeValidationMessage(tc.in); got != tc.want {
				t.Fatalf("got %q want %q", got, tc.want)
			}
		})
	}
}

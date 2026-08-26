// 本文件验证数据中心标识与颜色校验。

package datacenter

import "testing"

func TestValidateCode(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		code    string
		wantErr bool
	}{
		{name: "valid", code: "cq-lj", wantErr: false},
		{name: "single letter", code: "a", wantErr: false},
		{name: "reserved default", code: "default", wantErr: true},
		{name: "uppercase", code: "CQ-LJ", wantErr: true},
		{name: "leading hyphen", code: "-lj", wantErr: true},
		{name: "trailing hyphen", code: "lj-", wantErr: true},
		{name: "underscore", code: "cq_lj", wantErr: true},
		{name: "empty", code: "", wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateCode(tc.code)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for code %q", tc.code)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for code %q: %v", tc.code, err)
			}
		})
	}
}

func TestNormalizeColor(t *testing.T) {
	t.Parallel()
	if got := normalizeColor(""); got != defaultColor {
		t.Fatalf("empty color: got %s", got)
	}
	if got := normalizeColor("blue"); got != defaultColor {
		t.Fatalf("invalid color: got %s", got)
	}
	if got := normalizeColor("#22d3ee"); got != "#22d3ee" {
		t.Fatalf("valid color: got %s", got)
	}
}

func TestBuildLabel(t *testing.T) {
	t.Parallel()
	if got := buildLabel("cq-lj"); got != "maip.io/datacenter=cq-lj" {
		t.Fatalf("label: got %s", got)
	}
}

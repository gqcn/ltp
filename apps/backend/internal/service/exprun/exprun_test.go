// 本文件验证指标 JSON 解析。

package exprun

import "testing"

func TestLastJSONLine(t *testing.T) {
	raw := "info starting\n{\"ok\":true,\"step\":10}\n"
	got := lastJSONLine(raw)
	if got != `{"ok":true,"step":10}` {
		t.Fatalf("got %q", got)
	}
	if lastJSONLine("no json") != "" {
		t.Fatal("expected empty")
	}
}

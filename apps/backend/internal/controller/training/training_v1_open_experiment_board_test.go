// 本文件验证 TensorBoard 反代路径解析。

package training

import "testing"

func TestParseBoardURL(t *testing.T) {
	id, rest := parseBoardURL("/api/training/experiments/42/board/")
	if id != 42 || rest != "" {
		t.Fatalf("root id=%d rest=%q", id, rest)
	}
	id, rest = parseBoardURL("/api/training/experiments/42/board/index.js")
	if id != 42 || rest != "index.js" {
		t.Fatalf("js id=%d rest=%q", id, rest)
	}
	id, rest = parseBoardURL("/training/experiments/7/board/data/plugins_listing")
	if id != 7 || rest != "data/plugins_listing" {
		t.Fatalf("nested id=%d rest=%q", id, rest)
	}
}

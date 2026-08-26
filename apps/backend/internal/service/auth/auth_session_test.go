// 本文件验证会话令牌哈希的稳定性与区分度。

package auth

import "testing"

func TestSessionTokenHashStable(t *testing.T) {
	t.Parallel()
	a := sessionTokenHash("abc")
	b := sessionTokenHash("abc")
	c := sessionTokenHash("abd")
	if a != b {
		t.Fatal("hash should be deterministic")
	}
	if a == c {
		t.Fatal("different tokens must not hash equally")
	}
	if len(a) != 64 {
		t.Fatalf("sha256 hex length: got %d", len(a))
	}
}

func TestClip(t *testing.T) {
	t.Parallel()
	if got := clip("hello", 10); got != "hello" {
		t.Fatalf("got %q", got)
	}
	if got := clip("hello-world", 5); got != "hello" {
		t.Fatalf("got %q", got)
	}
}

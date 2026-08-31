// 本文件验证配置挂载路径冲突与按文件过滤。

package trainjob

import (
	"testing"

	"github.com/gqcn/ltp/internal/service/traincfg"
)

func TestMountPathsConflict(t *testing.T) {
	if !mountPathsConflict("/data/job/configs", "/data/job/configs") {
		t.Fatal("equal paths should conflict")
	}
	if !mountPathsConflict("/data/job/configs", "/data/job/configs/extra") {
		t.Fatal("prefix paths should conflict")
	}
	if mountPathsConflict("/data/job/configs", "/data/job/other") {
		t.Fatal("sibling paths should not conflict")
	}
}

func TestFilterMountFiles(t *testing.T) {
	files := []traincfg.File{
		{Path: "a.yaml", Content: "a: 1"},
		{Path: "b.yaml", Content: "b: 2"},
	}
	all, err := filterMountFiles(files, nil)
	if err != nil || len(all) != 2 {
		t.Fatalf("all files: n=%d err=%v", len(all), err)
	}
	if _, err := filterMountFiles(files, []string{}); err == nil {
		t.Fatal("expected empty file list error")
	}
	picked, err := filterMountFiles(files, []string{"b.yaml"})
	if err != nil || len(picked) != 1 || picked[0].Path != "b.yaml" {
		t.Fatalf("picked=%+v err=%v", picked, err)
	}
	if _, err := filterMountFiles(files, []string{"missing.yaml"}); err == nil {
		t.Fatal("expected missing file error")
	}
	if _, err := filterMountFiles(files, []string{"  "}); err == nil {
		t.Fatal("expected empty selection error")
	}
}

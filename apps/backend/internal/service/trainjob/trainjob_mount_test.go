// 本文件验证配置挂载路径冲突与按文件过滤。

package trainjob

import (
	"testing"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/service/traincfg"
)

func TestBuildVolcanoJobHostStorage(t *testing.T) {
	job := buildVolcanoJob(&preparedCreate{
		name:         "demo-job",
		image:        "ltp/experiment-agent:dev",
		command:      "python /opt/agent/agent.py demo",
		workdir:      "/data/hpc/home/algo",
		nodes:        1,
		gpusPerNode:  1,
		cpuPerNode:   1,
		memGiPerNode: 1,
		envMap:       map[string]string{consts.EnvTensorBoardLogDir: "/data/hpc/home/algo/outputs/demo-job/tensorboard"},
		ownerUser:    "algo",
		datacenter:   "cq-lj",
		gpuType:      "NVIDIA-H200",
	}, nil)
	spec := job.Spec.Tasks[0].Template.Spec
	if len(spec.InitContainers) != 1 || spec.InitContainers[0].Name != "prepare-dirs" {
		t.Fatalf("init=%+v", spec.InitContainers)
	}
	for name := range spec.InitContainers[0].Resources.Limits {
		if string(name) == consts.GPUResourceName {
			t.Fatal("init container must not request GPU")
		}
	}
	var (
		hasHome  bool
		hasShare bool
	)
	for _, vol := range spec.Volumes {
		if vol.HostPath == nil {
			continue
		}
		if vol.Name == "home" && vol.HostPath.Path == consts.HomeMountPath {
			hasHome = true
		}
		if vol.Name == "share" && vol.HostPath.Path == consts.ShareMountPath {
			hasShare = true
		}
	}
	if !hasHome || !hasShare {
		t.Fatalf("volumes=%+v", spec.Volumes)
	}
	main := spec.Containers[0]
	var mountedHome bool
	for _, m := range main.VolumeMounts {
		if m.Name == "home" && m.MountPath == consts.HomeMountPath {
			mountedHome = true
		}
	}
	if !mountedHome {
		t.Fatalf("mounts=%+v", main.VolumeMounts)
	}
}

func TestInjectTensorBoardLogDir(t *testing.T) {
	env := map[string]string{}
	injectTensorBoardLogDir(env, "guoqiang", "job-a")
	want := "/data/hpc/home/guoqiang/outputs/job-a/tensorboard"
	if env[consts.EnvTensorBoardLogDir] != want {
		t.Fatalf("got %q want %q", env[consts.EnvTensorBoardLogDir], want)
	}
	env[consts.EnvTensorBoardLogDir] = "/custom"
	injectTensorBoardLogDir(env, "guoqiang", "job-a")
	if env[consts.EnvTensorBoardLogDir] != "/custom" {
		t.Fatal("user logdir should not be overwritten")
	}
}

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

// 本文件验证 Fake 客户端与 Queue 资源数量解析。

package kube

import (
	"context"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/pkg/bizerr"
)

func TestFakeApplyConfigMapRecordsOwner(t *testing.T) {
	ctx := context.Background()
	fake := &Fake{}
	owner := OwnerRef{APIVersion: "batch.volcano.sh/v1alpha1", Kind: "Job", Name: "demo", UID: "uid-1"}
	if err := fake.ApplyConfigMap(ctx, "maip", "demo-cfg-0", map[string]string{"a.yaml": "x: 1"}, []OwnerRef{owner}); err != nil {
		t.Fatal(err)
	}
	got := fake.ConfigMapOwners["maip/demo-cfg-0"]
	if len(got) != 1 || got[0].UID != "uid-1" || got[0].Name != "demo" || got[0].Kind != "Job" {
		t.Fatalf("owners=%+v", got)
	}
}

func TestJobOwnerRefUsesVolcanoJobGVK(t *testing.T) {
	ref := JobOwnerRef(&VolcanoJob{Name: "demo", UID: "uid-9"})
	if ref.Name != "demo" || ref.UID != "uid-9" || ref.Kind == "" || ref.APIVersion == "" {
		t.Fatalf("ref=%+v", ref)
	}
}

func TestFakeAbortJobAndNamespace(t *testing.T) {
	ctx := context.Background()
	fake := &Fake{Jobs: map[string]*VolcanoJob{"maip/demo": {Namespace: "maip", Name: "demo", Phase: "Running"}}}
	if err := fake.EnsureNamespace(ctx, "maip"); err != nil {
		t.Fatal(err)
	}
	if !fake.Namespaces["maip"] {
		t.Fatal("namespace not recorded")
	}
	if err := fake.AbortJob(ctx, "maip", "demo"); err != nil {
		t.Fatal(err)
	}
	if fake.Jobs["maip/demo"].Phase != "Aborted" {
		t.Fatalf("phase=%s", fake.Jobs["maip/demo"].Phase)
	}
	if err := fake.AbortJob(ctx, "maip", "missing"); err != nil {
		t.Fatalf("missing job should be success: %v", err)
	}
}

func TestRestConfigFromContentBearerToken(t *testing.T) {
	raw := []byte(`apiVersion: v1
kind: Config
current-context: demo
contexts:
- name: demo
  context:
    cluster: demo
    user: demo
clusters:
- name: demo
  cluster:
    server: http://127.0.0.1:8080
users:
- name: demo
  user:
    token: demo-token
`)
	cfg, err := restConfigFromContent(raw)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Host != "http://127.0.0.1:8080" {
		t.Fatalf("host=%s", cfg.Host)
	}
	if cfg.BearerToken != "demo-token" {
		t.Fatalf("token=%s", cfg.BearerToken)
	}
}

func TestBuildNodeMergePatchDeletesLabel(t *testing.T) {
	unsched := true
	raw, err := buildNodeMergePatch("1", NodePatch{
		Labels:        map[string]string{"maip.io/datacenter": ""},
		Unschedulable: &unsched,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), `"maip.io/datacenter":null`) {
		t.Fatalf("patch=%s", raw)
	}
	if !strings.Contains(string(raw), `"unschedulable":true`) {
		t.Fatalf("patch=%s", raw)
	}
}

func TestNodeAlreadyAtTarget(t *testing.T) {
	node := &corev1.Node{}
	node.Labels = map[string]string{"maip.io/datacenter": "cq-lj"}
	node.Spec.Unschedulable = true
	unsched := true
	if !nodeAlreadyAtTarget(node, NodePatch{
		Labels:        map[string]string{"maip.io/datacenter": "cq-lj"},
		Unschedulable: &unsched,
	}) {
		t.Fatal("expected already at target")
	}
	if nodeAlreadyAtTarget(node, NodePatch{Labels: map[string]string{"maip.io/datacenter": ""}}) {
		t.Fatal("expected change when deleting label")
	}
}

func TestFakePatchNodeAndQueue(t *testing.T) {
	fake := &Fake{
		Nodes: []NodeSnapshot{{
			Name:        "n1",
			Schedulable: true,
			Labels:      map[string]string{"a": "1"},
		}},
	}
	unsched := true
	if err := fake.PatchNode(context.Background(), "n1", NodePatch{
		Labels:        map[string]string{"maip.io/datacenter": "cq-lj", "a": ""},
		Unschedulable: &unsched,
	}); err != nil {
		t.Fatal(err)
	}
	nodes, err := fake.ListNodes(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if nodes[0].Labels["maip.io/datacenter"] != "cq-lj" {
		t.Fatalf("labels: %+v", nodes[0].Labels)
	}
	if _, ok := nodes[0].Labels["a"]; ok {
		t.Fatal("deleted label still present")
	}
	if nodes[0].Schedulable {
		t.Fatal("expected cordon")
	}
	if err := fake.ApplyQueue(context.Background(), QueueSpec{Name: "q1"}); err != nil {
		t.Fatal(err)
	}
	if err := fake.SetQueueState(context.Background(), "q1", false); err != nil {
		t.Fatal(err)
	}
	got, err := fake.GetQueue(context.Background(), "q1")
	if err != nil {
		t.Fatal(err)
	}
	if got.State != "Closed" {
		t.Fatalf("state=%s", got.State)
	}
	if err := fake.DeleteQueue(context.Background(), "q1"); err != nil {
		t.Fatal(err)
	}
	if _, err := fake.GetQueue(context.Background(), "q1"); !bizerr.Is(err, CodeQueueNotFound) {
		t.Fatalf("want not found, got %v", err)
	}
}

func TestNormalizeVolcanoNames(t *testing.T) {
	if _, msg := NormalizeQueueName("default"); msg == "" {
		t.Fatal("expected reserved queue name")
	}
	if _, msg := NormalizeQueueName("Lab_GPU"); msg == "" {
		t.Fatal("expected underscore invalid")
	}
	got, msg := NormalizeQueueName("lab.gpu")
	if msg != "" || got != "lab.gpu" {
		t.Fatalf("queue dotted got=%s msg=%s", got, msg)
	}
	if _, msg := NormalizeJobName("Train_1"); msg == "" {
		t.Fatal("expected underscore job name invalid")
	}
	job, msg := NormalizeJobName("train-1")
	if msg != "" || job != "train-1" {
		t.Fatalf("job got=%s msg=%s", job, msg)
	}
	if _, msg := NormalizeTaskName("worker_0"); msg == "" {
		t.Fatal("expected underscore task name invalid")
	}
	task, msg := NormalizeTaskName("worker")
	if msg != "" || task != "worker" {
		t.Fatalf("task got=%s msg=%s", task, msg)
	}
}

func TestFakeCreateJobRejectsInvalidName(t *testing.T) {
	fake := &Fake{}
	_, err := fake.CreateJob(context.Background(), &batchv1alpha1.Job{
		ObjectMeta: metav1.ObjectMeta{Name: "Train_1", Namespace: "default"},
	})
	if err == nil {
		t.Fatal("expected invalid job name")
	}
	if !bizerr.Is(err, CodeInvalidName) {
		t.Fatalf("want CodeInvalidName, got %v", err)
	}
	_, err = fake.CreateJob(context.Background(), &batchv1alpha1.Job{
		ObjectMeta: metav1.ObjectMeta{Name: "train-1", Namespace: "default"},
		Spec: batchv1alpha1.JobSpec{
			Tasks: []batchv1alpha1.TaskSpec{{Name: "Bad_Task"}},
		},
	})
	if err == nil {
		t.Fatal("expected invalid task name")
	}
	if !bizerr.Is(err, CodeInvalidName) {
		t.Fatalf("want CodeInvalidName for task, got %v", err)
	}
}

func TestFakeCreateGetDeleteJob(t *testing.T) {
	fake := &Fake{}
	created, err := fake.CreateJob(context.Background(), &batchv1alpha1.Job{
		ObjectMeta: metav1.ObjectMeta{Name: "train-1", Namespace: "default"},
		Spec:       batchv1alpha1.JobSpec{Queue: "lab", MinAvailable: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.UID == "" || created.Queue != "lab" {
		t.Fatalf("created=%+v", created)
	}
	got, err := fake.GetJob(context.Background(), "default", "train-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "train-1" {
		t.Fatalf("name=%s", got.Name)
	}
	patched, err := fake.PatchJobAnnotations(context.Background(), "default", "train-1", got.ResourceVersion, map[string]string{
		"maip.io/user": "alice",
	})
	if err != nil {
		t.Fatal(err)
	}
	if patched.Annotations["maip.io/user"] != "alice" {
		t.Fatalf("annotations=%v", patched.Annotations)
	}
	if patched.ResourceVersion == got.ResourceVersion {
		t.Fatal("expected resourceVersion bump")
	}
	if err := fake.DeleteJob(context.Background(), "default", "train-1", created.UID); err != nil {
		t.Fatal(err)
	}
	if _, err := fake.GetJob(context.Background(), "default", "train-1"); !bizerr.Is(err, CodeJobNotFound) {
		t.Fatalf("want not found, got %v", err)
	}
}

func TestAggregatePodUsageSkipsTerminating(t *testing.T) {
	now := metav1.Now()
	pods := []corev1.Pod{
		{
			Spec: corev1.PodSpec{
				NodeName: "n1",
				Containers: []corev1.Container{
					{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
						corev1.ResourceCPU: resource.MustParse("100m"),
					}}},
				},
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{DeletionTimestamp: &now},
			Spec: corev1.PodSpec{
				NodeName: "n1",
				Containers: []corev1.Container{
					{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
						corev1.ResourceCPU: resource.MustParse("900m"),
					}}},
				},
			},
		},
		{
			Status: corev1.PodStatus{Phase: corev1.PodSucceeded},
			Spec: corev1.PodSpec{
				NodeName: "n1",
				Containers: []corev1.Container{
					{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
						corev1.ResourceCPU: resource.MustParse("400m"),
					}}},
				},
			},
		},
	}
	used := aggregatePodUsage(pods)
	if used["n1"].cpuMilli != 100 || used["n1"].pods != 1 {
		t.Fatalf("usage=%+v", used["n1"])
	}
}

func TestPodRequestAccInitContainerMax(t *testing.T) {
	pod := &corev1.Pod{
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
					corev1.ResourceCPU:                          resource.MustParse("100m"),
					corev1.ResourceMemory:                       resource.MustParse("1Gi"),
					corev1.ResourceName(consts.GPUResourceName): resource.MustParse("1"),
				}}},
				{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("100m"),
					corev1.ResourceMemory: resource.MustParse("1Gi"),
				}}},
			},
			InitContainers: []corev1.Container{
				{Resources: corev1.ResourceRequirements{Requests: corev1.ResourceList{
					corev1.ResourceCPU:                          resource.MustParse("500m"),
					corev1.ResourceMemory:                       resource.MustParse("4Gi"),
					corev1.ResourceName(consts.GPUResourceName): resource.MustParse("2"),
				}}},
			},
		},
	}
	acc := podRequestAcc(pod)
	if acc.cpuMilli != 500 {
		t.Fatalf("cpu=%d", acc.cpuMilli)
	}
	if acc.memBytes != 4*1024*1024*1024 {
		t.Fatalf("mem=%d", acc.memBytes)
	}
	if acc.gpu != 2 {
		t.Fatalf("gpu=%d", acc.gpu)
	}
}

func TestProjectQueueAllocated(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]interface{}{
		"metadata": map[string]interface{}{"name": "lab"},
		"status": map[string]interface{}{
			"state":   "Open",
			"running": int64(2),
			"pending": int64(1),
			"allocated": map[string]interface{}{
				"cpu":            "1500m",
				"memory":         "2Gi",
				"nvidia.com/gpu": "3",
			},
		},
	}}
	snap := projectQueue(obj)
	if snap.CPUUsed != 1 {
		t.Fatalf("cpu=%d", snap.CPUUsed)
	}
	if snap.MemUsedGi != 2 {
		t.Fatalf("mem=%d", snap.MemUsedGi)
	}
	if snap.GPUUsed != 3 {
		t.Fatalf("gpu=%d", snap.GPUUsed)
	}
	if snap.Running != 2 || snap.Pending != 1 {
		t.Fatalf("running=%d pending=%d", snap.Running, snap.Pending)
	}
}

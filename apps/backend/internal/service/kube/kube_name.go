// 本文件按 Kubernetes / Volcano 规则校验 Queue 与 Job 对象名。
// Queue 与 Job 的 metadata.name 须为 DNS-1123 子域；Volcano Job webhook 另用 IsQualifiedName（名称段最长 63）。
// 二者还用作 Pod 标签值，因此平台统一最长 63。队列名不得为 reserved 的 root/default。

package kube

import (
	"fmt"
	"strings"

	"k8s.io/apimachinery/pkg/util/validation"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"

	"github.com/gqcn/ltp/pkg/bizerr"
)

const volcanoNameMax = 63

// NormalizeQueueName 规范化 Volcano Queue 对象名。第二个返回值为中文错误，空表示通过。
func NormalizeQueueName(raw string) (string, string) {
	name, msg := normalizeDNS1123Subdomain(raw, "请填写队列标识", "队列标识")
	if msg != "" {
		return "", msg
	}
	if name == QueueParentRoot || name == "default" {
		return "", "队列标识不能使用 root 或 default"
	}
	return name, ""
}

// NormalizeJobName 规范化 Volcano Job 对象名。第二个返回值为中文错误，空表示通过。
func NormalizeJobName(raw string) (string, string) {
	name, msg := normalizeDNS1123Subdomain(raw, "请填写任务名称", "任务名称")
	if msg != "" {
		return "", msg
	}
	if msgs := validation.IsQualifiedName(name); len(msgs) > 0 {
		return "", "任务名称须符合 Volcano Job 名（Kubernetes qualified name，最长 63 个字符）"
	}
	return name, ""
}

// NormalizeTaskName 规范化 Volcano Job spec.tasks[].name，须为 DNS-1123 label。
func NormalizeTaskName(raw string) (string, string) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", "请填写任务名称"
	}
	if len(name) > volcanoNameMax {
		return "", "任务名称最长 63 个字符"
	}
	if msgs := validation.IsDNS1123Label(name); len(msgs) > 0 {
		return "", "任务名称须符合 Kubernetes DNS-1123 label：小写字母、数字与连字符，且不能以连字符开头或结尾"
	}
	return name, ""
}

// normalizeDNS1123Subdomain 按 DNS-1123 子域规范化名称，不自动转小写。
func normalizeDNS1123Subdomain(raw, blank, field string) (string, string) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", blank
	}
	if len(name) > volcanoNameMax {
		return "", field + "最长 63 个字符"
	}
	if msgs := validation.IsDNS1123Subdomain(name); len(msgs) > 0 {
		return "", field + "须符合 Kubernetes DNS-1123 子域：小写字母、数字、连字符与点，且不能以连字符或点开头或结尾"
	}
	return name, ""
}

// validateVolcanoJobNames 校验 Job 对象名、非空 task 名，以及二者组合后的 Pod 名。
func validateVolcanoJobNames(job *batchv1alpha1.Job) error {
	if _, msg := NormalizeJobName(job.Name); msg != "" {
		return invalidName(msg)
	}
	jobName := strings.TrimSpace(job.Name)
	for i := range job.Spec.Tasks {
		taskName := strings.TrimSpace(job.Spec.Tasks[i].Name)
		if taskName == "" {
			continue
		}
		normalized, taskMsg := NormalizeTaskName(taskName)
		if taskMsg != "" {
			return invalidName(taskMsg)
		}
		podName := fmt.Sprintf("%s-%s-%d", jobName, normalized, i)
		if msgs := validation.IsQualifiedName(podName); len(msgs) > 0 {
			return invalidName("任务名称与 task 组合后的 Pod 名不符合 Kubernetes 规范，请缩短任务名称或 task 名")
		}
	}
	return nil
}

// invalidName 构造名称校验失败的业务错误。
func invalidName(message string) error {
	return bizerr.New(CodeInvalidName, bizerr.P("message", message))
}

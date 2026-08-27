// 本文件验证 FastX JSON 解析。

package alert

import (
	"strings"
	"testing"
)

func TestParseFastXExample(t *testing.T) {
	raw := []byte(`{
  "originalBody": {"faultName": "GPU-XID79卡故障-测试故障456", "faultEnv": null, "cluster": null, "handlingStrategy": "manual"},
  "alarmInfo": {
    "ruleId": null,
    "alarmCount": 1,
    "level": 2,
    "name": "wjl-test-告警",
    "alarmData": [
      ["告警条件", "当前值", "标签"],
      ["> 0", "100.0", "instance:msxf-hpc-2-125-ai,Hostname:msxf-hpc-2-125-ai,gpu:4,__name__:DCGM_FI_DEV_GPU_UTIL,"],
      ["> 0", "90.0", "instance:msxf-hpc-64-42-ai,Hostname:msxf-hpc-64-42-ai,gpu:2,__name__:DCGM_FI_DEV_GPU_UTIL,"]
    ],
    "firstAlarmTime": "2026-08-18 16:50:52.0",
    "createUser": "jialing.wu"
  }
}`)
	got, err := parseFastX(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got.title != "wjl-test-告警" {
		t.Fatalf("title=%s", got.title)
	}
	if got.faultInfo != "GPU-XID79卡故障-测试故障456" {
		t.Fatalf("fault=%s", got.faultInfo)
	}
	if got.severity != SeverityWarning {
		t.Fatalf("severity=%s", got.severity)
	}
	if !strings.Contains(got.nodeNames, "msxf-hpc-2-125-ai") || !strings.Contains(got.nodeNames, "msxf-hpc-64-42-ai") {
		t.Fatalf("nodes=%s", got.nodeNames)
	}
	if got.firstAt == nil {
		t.Fatal("first alarm time missing")
	}
}

func TestParseFastXLevelCritical(t *testing.T) {
	raw := []byte(`{"originalBody":{"faultName":"x"},"alarmInfo":{"name":"n","level":3,"alarmData":[]}}`)
	got, err := parseFastX(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got.severity != SeverityCritical {
		t.Fatalf("severity=%s", got.severity)
	}
}

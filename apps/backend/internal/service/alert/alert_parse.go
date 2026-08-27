// 本文件解析 FastX Webhook JSON。

package alert

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/gogf/gf/v2/os/gtime"
)

type fastxPayload struct {
	OriginalBody struct {
		FaultName        string `json:"faultName"`
		HandlingStrategy string `json:"handlingStrategy"`
	} `json:"originalBody"`
	AlarmInfo struct {
		AlarmCount     int     `json:"alarmCount"`
		Level          int     `json:"level"`
		Name           string  `json:"name"`
		AlarmData      [][]any `json:"alarmData"`
		FirstAlarmTime string  `json:"firstAlarmTime"`
		CreateUser     string  `json:"createUser"`
	} `json:"alarmInfo"`
}

type parsedAlert struct {
	title      string
	alertInfo  string
	faultInfo  string
	severity   Severity
	nodeNames  string
	count      int
	level      int
	createUser string
	firstAt    *gtime.Time
}

func parseFastX(raw []byte) (*parsedAlert, error) {
	var payload fastxPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, errInvalid("invalid FastX JSON")
	}
	title := strings.TrimSpace(payload.AlarmInfo.Name)
	fault := strings.TrimSpace(payload.OriginalBody.FaultName)
	if title == "" {
		title = fault
	}
	if title == "" {
		title = "FastX 告警"
	}
	level := payload.AlarmInfo.Level
	nodes := extractHostnames(payload.AlarmInfo.AlarmData)
	info := buildAlertInfo(payload.AlarmInfo.AlarmData, nodes)
	count := payload.AlarmInfo.AlarmCount
	if count <= 0 {
		count = 1
	}
	return &parsedAlert{
		title:      title,
		alertInfo:  info,
		faultInfo:  fault,
		severity:   severityFromLevel(level),
		nodeNames:  strings.Join(nodes, ","),
		count:      count,
		level:      level,
		createUser: strings.TrimSpace(payload.AlarmInfo.CreateUser),
		firstAt:    parseFastXTime(payload.AlarmInfo.FirstAlarmTime),
	}, nil
}

func severityFromLevel(level int) Severity {
	switch {
	case level <= 0:
		return SeverityWarning
	case level == 1:
		return SeverityInfo
	case level == 2:
		return SeverityWarning
	default:
		return SeverityCritical
	}
}

func extractHostnames(data [][]any) []string {
	seen := map[string]struct{}{}
	var out []string
	for i, row := range data {
		if i == 0 {
			continue
		}
		if len(row) < 3 {
			continue
		}
		labels := stringify(row[2])
		host := labelValue(labels, "Hostname")
		if host == "" {
			host = labelValue(labels, "instance")
		}
		host = strings.TrimSpace(host)
		if host == "" {
			continue
		}
		if _, ok := seen[host]; ok {
			continue
		}
		seen[host] = struct{}{}
		out = append(out, host)
	}
	sort.Strings(out)
	return out
}

func labelValue(raw string, key string) string {
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		idx := strings.Index(part, ":")
		if idx <= 0 {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(part[:idx]), key) {
			return strings.TrimSpace(part[idx+1:])
		}
	}
	return ""
}

func buildAlertInfo(data [][]any, nodes []string) string {
	rows := 0
	metric := ""
	for i, row := range data {
		if i == 0 {
			continue
		}
		rows++
		if metric == "" && len(row) >= 3 {
			metric = labelValue(stringify(row[2]), "__name__")
		}
	}
	if rows == 0 {
		if len(nodes) == 0 {
			return "FastX 告警"
		}
		return fmt.Sprintf("FastX 告警，涉及 %s", strings.Join(nodes, "、"))
	}
	hostBit := ""
	if len(nodes) > 0 {
		hostBit = fmt.Sprintf("，节点 %s", strings.Join(nodes, "、"))
	}
	metricBit := ""
	if metric != "" {
		metricBit = "指标 " + metric + "，"
	}
	return fmt.Sprintf("FastX 上报 %s%d 条样本%s", metricBit, rows, hostBit)
}

func stringify(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case fmt.Stringer:
		return t.String()
	default:
		b, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprint(v)
		}
		return strings.Trim(string(b), `"`)
	}
}

func parseFastXTime(raw string) *gtime.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	layouts := []string{
		"2006-01-02 15:04:05.0",
		"2006-01-02 15:04:05",
		time.RFC3339,
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, raw, time.Local); err == nil {
			return gtime.NewFromTime(t)
		}
	}
	if t := gtime.NewFromStr(raw); t != nil && !t.IsZero() {
		return t
	}
	return nil
}

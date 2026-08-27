// 本文件实现 FastX Webhook 入库。

package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Ingest 校验令牌并写入告警。
func (s *serviceImpl) Ingest(ctx context.Context, in IngestInput) (int64, error) {
	if s.token != "" && strings.TrimSpace(in.Token) != s.token {
		return 0, bizerr.New(CodeUnauthorized)
	}
	raw := bytes.TrimSpace(in.Payload)
	if len(raw) == 0 {
		return 0, errInvalid("empty payload")
	}
	if !json.Valid(raw) {
		return 0, errInvalid("invalid FastX JSON")
	}
	parsed, err := parseFastX(raw)
	if err != nil {
		return 0, err
	}
	id, err := dao.OpsAlert.Ctx(ctx).Data(do.OpsAlert{
		Severity:       string(parsed.severity),
		Title:          parsed.title,
		AlertInfo:      parsed.alertInfo,
		FaultInfo:      parsed.faultInfo,
		Source:         sourceFastX,
		NodeNames:      parsed.nodeNames,
		Status:         string(StatusOpen),
		AlarmCount:     parsed.count,
		AlarmLevel:     parsed.level,
		CreateUser:     parsed.createUser,
		FirstAlarmAt:   parsed.firstAt,
		WebhookPayload: string(raw),
	}).InsertAndGetId()
	if err != nil {
		return 0, gerror.Wrap(err, "insert alert")
	}
	logger.Infof(ctx, "ingested fastx alert id=%d title=%s", id, parsed.title)
	return id, nil
}

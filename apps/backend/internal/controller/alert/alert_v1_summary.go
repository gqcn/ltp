// 本文件实现告警汇总处理。

package alert

import (
	"context"

	v1 "github.com/gqcn/ltp/api/alert/v1"
)

// Summary 返回未完成告警数量。
func (c *ControllerV1) Summary(ctx context.Context, req *v1.SummaryReq) (res *v1.SummaryRes, err error) {
	_ = req
	out, err := c.alertSvc.Summary(ctx)
	if err != nil {
		return nil, err
	}
	return &v1.SummaryRes{
		Unfinished: out.Unfinished,
		Open:       out.Open,
		Following:  out.Following,
	}, nil
}

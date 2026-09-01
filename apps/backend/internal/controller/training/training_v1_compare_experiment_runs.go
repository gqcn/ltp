// 本文件实现实验 Run 对比。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
)

// CompareExperimentRuns 返回快照与超参 Diff。
func (c *ControllerV1) CompareExperimentRuns(ctx context.Context, req *v1.CompareExperimentRunsReq) (*v1.CompareExperimentRunsRes, error) {
	_, runActor, err := c.expActor(ctx)
	if err != nil {
		return nil, err
	}
	out, err := c.runSvc.Compare(ctx, runActor, req.Ids)
	if err != nil {
		return nil, err
	}
	runs := make([]*v1.ExperimentRunDetail, 0, len(out.Runs))
	for _, item := range out.Runs {
		runs = append(runs, toExperimentRunDetail(item))
	}
	fields := make([]v1.ExperimentCompareField, 0, len(out.Fields))
	for _, field := range out.Fields {
		fields = append(fields, v1.ExperimentCompareField{Key: field.Key, Values: field.Values, Same: field.Same})
	}
	return &v1.CompareExperimentRunsRes{Runs: runs, Fields: fields, SameLocation: out.SameLocation}, nil
}

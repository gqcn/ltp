// 本文件实现提交训练任务。

package training

import (
	"context"

	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/trainjob"
)

// CreateJob 提交训练任务。
func (c *ControllerV1) CreateJob(ctx context.Context, req *v1.CreateJobReq) (*v1.CreateJobRes, error) {
	actor, err := c.jobActor(ctx)
	if err != nil {
		return nil, err
	}
	id, err := c.jobSvc.Create(ctx, trainjob.CreateInput{
		Actor:        actor,
		ClusterID:    req.ClusterId,
		Name:         req.Name,
		Workdir:      req.Workdir,
		Priority:     req.Priority,
		TeamID:       req.TeamId,
		QueueID:      req.QueueId,
		Nodes:        req.Nodes,
		GpusPerNode:  req.GpusPerNode,
		CPUPerNode:   req.CpuPerNode,
		MemGiPerNode: req.MemGiPerNode,
		Image:        req.Image,
		Command:      req.Command,
		Env:          fromEnv(req.Env),
		Mounts:       fromMounts(req.Mounts),
		RunUserID:    req.RunUserId,
		RerunFromID:  req.RerunFromId,
	})
	if err != nil {
		return nil, err
	}
	return &v1.CreateJobRes{Id: id}, nil
}

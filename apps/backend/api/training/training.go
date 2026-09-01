// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package training

import (
	"context"

	"github.com/gqcn/ltp/api/training/v1"
)

type ITrainingV1 interface {
	ListClusters(ctx context.Context, req *v1.ListClustersReq) (res *v1.ListClustersRes, err error)
	CreateConfig(ctx context.Context, req *v1.CreateConfigReq) (res *v1.CreateConfigRes, err error)
	SaveConfigDraft(ctx context.Context, req *v1.SaveConfigDraftReq) (res *v1.SaveConfigDraftRes, err error)
	GetConfig(ctx context.Context, req *v1.GetConfigReq) (res *v1.GetConfigRes, err error)
	ListConfigs(ctx context.Context, req *v1.ListConfigsReq) (res *v1.ListConfigsRes, err error)
	PublishConfig(ctx context.Context, req *v1.PublishConfigReq) (res *v1.PublishConfigRes, err error)
	UpdateConfigStatus(ctx context.Context, req *v1.UpdateConfigStatusReq) (res *v1.UpdateConfigStatusRes, err error)
	GetConfigVersion(ctx context.Context, req *v1.GetConfigVersionReq) (res *v1.GetConfigVersionRes, err error)
	OpenExperimentBoard(ctx context.Context, req *v1.OpenExperimentBoardReq) (res *v1.OpenExperimentBoardRes, err error)
	CreateExperimentProject(ctx context.Context, req *v1.CreateExperimentProjectReq) (res *v1.CreateExperimentProjectRes, err error)
	DeleteExperimentProject(ctx context.Context, req *v1.DeleteExperimentProjectReq) (res *v1.DeleteExperimentProjectRes, err error)
	ListExperimentProjects(ctx context.Context, req *v1.ListExperimentProjectsReq) (res *v1.ListExperimentProjectsRes, err error)
	UpdateExperimentProject(ctx context.Context, req *v1.UpdateExperimentProjectReq) (res *v1.UpdateExperimentProjectRes, err error)
	CompareExperimentRuns(ctx context.Context, req *v1.CompareExperimentRunsReq) (res *v1.CompareExperimentRunsRes, err error)
	DeleteExperimentRun(ctx context.Context, req *v1.DeleteExperimentRunReq) (res *v1.DeleteExperimentRunRes, err error)
	GetExperimentRun(ctx context.Context, req *v1.GetExperimentRunReq) (res *v1.GetExperimentRunRes, err error)
	ListExperimentRuns(ctx context.Context, req *v1.ListExperimentRunsReq) (res *v1.ListExperimentRunsRes, err error)
	UpdateExperimentRun(ctx context.Context, req *v1.UpdateExperimentRunReq) (res *v1.UpdateExperimentRunRes, err error)
	ListJobAlerts(ctx context.Context, req *v1.ListJobAlertsReq) (res *v1.ListJobAlertsRes, err error)
	CreateJob(ctx context.Context, req *v1.CreateJobReq) (res *v1.CreateJobRes, err error)
	GetJob(ctx context.Context, req *v1.GetJobReq) (res *v1.GetJobRes, err error)
	ListJobs(ctx context.Context, req *v1.ListJobsReq) (res *v1.ListJobsRes, err error)
	GetJobLogs(ctx context.Context, req *v1.GetJobLogsReq) (res *v1.GetJobLogsRes, err error)
	ListJobPods(ctx context.Context, req *v1.ListJobPodsReq) (res *v1.ListJobPodsRes, err error)
	UpdateJobStatus(ctx context.Context, req *v1.UpdateJobStatusReq) (res *v1.UpdateJobStatusRes, err error)
	ListMyQueues(ctx context.Context, req *v1.ListMyQueuesReq) (res *v1.ListMyQueuesRes, err error)
	ListRunUsers(ctx context.Context, req *v1.ListRunUsersReq) (res *v1.ListRunUsersRes, err error)
	ListTeams(ctx context.Context, req *v1.ListTeamsReq) (res *v1.ListTeamsRes, err error)
}

// 本文件把训练服务投影转换为 API DTO。

package training

import (
	v1 "github.com/gqcn/ltp/api/training/v1"
	"github.com/gqcn/ltp/internal/service/expproject"
	"github.com/gqcn/ltp/internal/service/exprun"
	"github.com/gqcn/ltp/internal/service/traincfg"
	"github.com/gqcn/ltp/internal/service/trainjob"
)

func toJobListItem(item *trainjob.Item) *v1.JobListItem {
	if item == nil {
		return &v1.JobListItem{}
	}
	return &v1.JobListItem{
		Id:                  item.ID,
		ClusterId:           item.ClusterID,
		Name:                item.Name,
		Status:              item.Status,
		Priority:            item.Priority,
		TeamId:              item.TeamID,
		TeamName:            item.TeamName,
		QueueId:             item.QueueID,
		QueueName:           item.QueueName,
		QueueDisplayName:    item.QueueDisplayName,
		DatacenterCode:      item.DatacenterCode,
		DatacenterName:      item.DatacenterName,
		DatacenterShortName: item.DatacenterShortName,
		DatacenterColor:     item.DatacenterColor,
		GpuType:             item.GPUType,
		RequireIb:           item.RequireIB,
		Nodes:               item.Nodes,
		GpusPerNode:         item.GpusPerNode,
		GpuCount:            item.GPUCount,
		CpuPerNode:          item.CPUPerNode,
		MemGiPerNode:        item.MemGiPerNode,
		OwnerUsername:       item.OwnerUsername,
		OwnerNickname:       item.OwnerNickname,
		SubmittedByUsername: item.SubmittedByUsername,
		SubmittedByNickname: item.SubmittedByNickname,
		DurationMs:          item.DurationMs,
		GpuHours:            item.GPUHours,
		SyncError:           item.SyncError,
		FailReason:          item.FailReason,
		RerunFromId:         item.RerunFromID,
		ExperimentId:        item.ExperimentID,
		Loss:                item.Loss,
		Step:                item.Step,
		MaxSteps:            item.MaxSteps,
		CreatedAt:           item.CreatedAt,
		StartedAt:           item.StartedAt,
		EndedAt:             item.EndedAt,
	}
}

func toJobDetail(item *trainjob.Item) *v1.GetJobRes {
	out := &v1.GetJobRes{JobListItem: *toJobListItem(item)}
	if item == nil {
		return out
	}
	out.Namespace = item.Namespace
	out.Image = item.Image
	out.Command = item.Command
	out.Workdir = item.Workdir
	out.Env = toEnv(item.Env)
	out.Mounts = toMounts(item.Mounts)
	out.ExperimentName = item.ExperimentName
	return out
}

// toExperimentProject 转换项目投影。
func toExperimentProject(item *expproject.Item) *v1.ExperimentProject {
	if item == nil {
		return &v1.ExperimentProject{}
	}
	return &v1.ExperimentProject{
		Id:          item.ID,
		Name:        item.Name,
		DisplayName: item.DisplayName,
		Description: item.Description,
		RunCount:    item.RunCount,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}

// toExperimentRunListItem 转换 Run 列表行。
func toExperimentRunListItem(item *exprun.Item) *v1.ExperimentRunListItem {
	if item == nil {
		return &v1.ExperimentRunListItem{}
	}
	return &v1.ExperimentRunListItem{
		Id:             item.ID,
		Name:           item.Name,
		ProjectId:      item.ProjectID,
		ProjectName:    item.ProjectName,
		ClusterId:      item.ClusterID,
		TeamId:         item.TeamID,
		TeamName:       item.TeamName,
		JobId:          item.JobID,
		JobName:        item.JobName,
		JobStatus:      item.JobStatus,
		DatacenterCode: item.DatacenterCode,
		TbLogdir:       item.TbLogdir,
		OwnerUsername:  item.OwnerUsername,
		OwnerNickname:  item.OwnerNickname,
		Loss:           item.Loss,
		Step:           item.Step,
		MaxSteps:       item.MaxSteps,
		TokensPerSec:   item.TokensPerSec,
		MetricsAt:      item.MetricsAt,
		MetricsError:   item.MetricsError,
		CreatedAt:      item.CreatedAt,
		UpdatedAt:      item.UpdatedAt,
	}
}

// toExperimentRunDetail 转换 Run 详情。
func toExperimentRunDetail(item *exprun.Item) *v1.ExperimentRunDetail {
	out := &v1.ExperimentRunDetail{ExperimentRunListItem: *toExperimentRunListItem(item)}
	if item == nil {
		return out
	}
	out.Image = item.Image
	out.Command = item.Command
	out.Workdir = item.Workdir
	out.Nodes = item.Nodes
	out.GpusPerNode = item.GpusPerNode
	out.GpuCount = item.GPUCount
	out.Env = toEnv(item.Env)
	return out
}

func toEnv(in []trainjob.EnvEntry) []v1.EnvEntry {
	out := make([]v1.EnvEntry, 0, len(in))
	for _, e := range in {
		out = append(out, v1.EnvEntry{Key: e.Key, Value: e.Value})
	}
	return out
}

func fromEnv(in []v1.EnvEntry) []trainjob.EnvEntry {
	out := make([]trainjob.EnvEntry, 0, len(in))
	for _, e := range in {
		out = append(out, trainjob.EnvEntry{Key: e.Key, Value: e.Value})
	}
	return out
}

func toMounts(in []trainjob.Mount) []v1.MountSnapshot {
	out := make([]v1.MountSnapshot, 0, len(in))
	for _, m := range in {
		files := make([]v1.MountFile, 0, len(m.Files))
		for _, f := range m.Files {
			files = append(files, v1.MountFile{Path: f.Path, Content: f.Content, Size: f.Size})
		}
		out = append(out, v1.MountSnapshot{
			SetId:       m.SetID,
			SetName:     m.SetName,
			DisplayName: m.DisplayName,
			Version:     m.Version,
			MountPath:   m.MountPath,
			Digest:      m.Digest,
			Files:       files,
		})
	}
	return out
}

func fromMounts(in []v1.MountInput) []trainjob.MountInput {
	out := make([]trainjob.MountInput, 0, len(in))
	for _, m := range in {
		out = append(out, trainjob.MountInput{SetID: m.SetId, Version: m.Version, MountPath: m.MountPath, Files: m.Files})
	}
	return out
}

func toConfigListItem(item *traincfg.Item) *v1.ConfigListItem {
	if item == nil {
		return &v1.ConfigListItem{}
	}
	return &v1.ConfigListItem{
		Id:             item.ID,
		Name:           item.Name,
		DisplayName:    item.DisplayName,
		TeamId:         item.TeamID,
		TeamName:       item.TeamName,
		Framework:      item.Framework,
		Visibility:     item.Visibility,
		Status:         item.Status,
		LatestVersion:  item.LatestVersion,
		LatestMessage:  item.LatestMessage,
		FileCount:      item.FileCount,
		OwnerUsername:  item.OwnerUsername,
		OwnerNickname:  item.OwnerNickname,
		HasDraft:       item.HasDraft,
		DraftUpdatedAt: item.DraftUpdatedAt,
		UpdatedAt:      item.UpdatedAt,
		CreatedAt:      item.CreatedAt,
	}
}

func toConfigFiles(in []traincfg.File) []v1.ConfigFile {
	out := make([]v1.ConfigFile, 0, len(in))
	for _, f := range in {
		out = append(out, v1.ConfigFile{Path: f.Path, Content: f.Content})
	}
	return out
}

func fromConfigFiles(in []v1.ConfigFile) []traincfg.File {
	out := make([]traincfg.File, 0, len(in))
	for _, f := range in {
		out = append(out, traincfg.File{Path: f.Path, Content: f.Content})
	}
	return out
}

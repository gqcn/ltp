// 本文件实现训练任务提交：校验、创建 ConfigMap 与 Volcano Job、写入业务行。

package trainjob

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/gogf/gf/v2/errors/gerror"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	batchv1alpha1 "volcano.sh/apis/pkg/apis/batch/v1alpha1"
	busv1alpha1 "volcano.sh/apis/pkg/apis/bus/v1alpha1"

	"github.com/gqcn/ltp/internal/consts"
	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Create 创建业务任务与 Volcano Job。
func (s *serviceImpl) Create(ctx context.Context, in CreateInput) (int64, error) {
	prepared, err := s.prepareCreate(ctx, in)
	if err != nil {
		return 0, err
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return 0, err
	}
	if err := client.EnsureNamespace(ctx, consts.TrainingNamespace); err != nil {
		return 0, err
	}
	var (
		cmNames = make([]string, 0, len(prepared.mounts))
		cmData  = make([]map[string]string, 0, len(prepared.mounts))
	)
	for i, mount := range prepared.mounts {
		cmName := configMapName(prepared.name, i)
		data := map[string]string{}
		for _, file := range mount.Files {
			data[configMapKey(file.Path)] = file.Content
		}
		cmNames = append(cmNames, cmName)
		cmData = append(cmData, data)
	}
	job := buildVolcanoJob(prepared, cmNames)
	created, err := client.CreateJob(ctx, job)
	if err != nil {
		return 0, err
	}
	if len(cmNames) > 0 {
		owner := kube.JobOwnerRef(created)
		for i, cmName := range cmNames {
			if err := client.ApplyConfigMap(ctx, consts.TrainingNamespace, cmName, cmData[i], []kube.OwnerRef{owner}); err != nil {
				s.rollbackConfigMaps(ctx, client, cmNames)
				_ = client.DeleteJob(ctx, consts.TrainingNamespace, prepared.name, created.UID)
				return 0, err
			}
		}
	}
	mountJSON, err := json.Marshal(prepared.mounts)
	if err != nil {
		return 0, gerror.Wrap(err, "marshal mounts")
	}
	envJSON, err := json.Marshal(prepared.envMap)
	if err != nil {
		return 0, gerror.Wrap(err, "marshal env")
	}
	phase := created.Phase
	status := mapVolcanoPhase(phase)
	if status == "" {
		status = statusQueued
	}
	id, err := dao.TrainJob.Ctx(ctx).Data(do.TrainJob{
		ClusterId:           in.ClusterID,
		Name:                prepared.name,
		Namespace:           consts.TrainingNamespace,
		TeamId:              prepared.teamID,
		TeamName:            prepared.teamName,
		QueueId:             prepared.queueID,
		QueueName:           prepared.queueName,
		QueueDisplayName:    prepared.queueDisplay,
		DatacenterCode:      prepared.datacenter,
		GpuType:             prepared.gpuType,
		RequireIb:           prepared.requireIB,
		Priority:            prepared.priority,
		Status:              status,
		VolcanoPhase:        phase,
		VolcanoUid:          created.UID,
		Nodes:               prepared.nodes,
		GpusPerNode:         prepared.gpusPerNode,
		GpuCount:            prepared.gpuCount,
		CpuPerNode:          prepared.cpuPerNode,
		MemGiPerNode:        prepared.memGiPerNode,
		Image:               prepared.image,
		Command:             prepared.command,
		Env:                 string(envJSON),
		Workdir:             prepared.workdir,
		OwnerUserId:         prepared.ownerID,
		OwnerUsername:       prepared.ownerUser,
		OwnerNickname:       prepared.ownerNick,
		SubmittedByUserId:   in.Actor.UserID,
		SubmittedByUsername: in.Actor.Username,
		SubmittedByNickname: in.Actor.Nickname,
		RerunFromId:         prepared.rerunFrom,
		ConfigMounts:        string(mountJSON),
		ListBucket:          listBucketOf(status),
		PriorityOrder:       priorityOrderOf(prepared.priority),
	}).InsertAndGetId()
	if err != nil {
		_ = client.DeleteJob(ctx, consts.TrainingNamespace, prepared.name, created.UID)
		s.rollbackConfigMaps(ctx, client, cmNames)
		return 0, gerror.Wrap(err, "insert train job")
	}
	logger.Infof(ctx, "created train job %d name=%s cluster=%d", id, prepared.name, in.ClusterID)
	return id, nil
}

type preparedCreate struct {
	name         string
	teamID       int64
	teamName     string
	queueID      int64
	queueName    string
	queueDisplay string
	datacenter   string
	gpuType      string
	requireIB    bool
	priority     string
	nodes        int
	gpusPerNode  int
	gpuCount     int
	cpuPerNode   int
	memGiPerNode int
	image        string
	command      string
	workdir      string
	envMap       map[string]string
	mounts       []Mount
	ownerID      int64
	ownerUser    string
	ownerNick    string
	rerunFrom    int64
}

func (s *serviceImpl) prepareCreate(ctx context.Context, in CreateInput) (*preparedCreate, error) {
	name, msg := kube.NormalizeJobName(in.Name)
	if msg != "" {
		return nil, errInvalid(msg)
	}
	exists, err := dao.TrainJob.Ctx(ctx).Where(do.TrainJob{ClusterId: in.ClusterID, Namespace: consts.TrainingNamespace, Name: name}).Count()
	if err != nil {
		return nil, gerror.Wrap(err, "check job name")
	}
	if exists > 0 {
		return nil, bizerr.New(CodeNameExists)
	}
	priority, ok := parsePriority(in.Priority)
	if !ok {
		return nil, errInvalid("请选择优先级")
	}
	workdir := strings.TrimSpace(in.Workdir)
	if workdir == "" {
		return nil, errInvalid("请填写工作路径")
	}
	if utf8.RuneCountInString(workdir) > 256 {
		return nil, errInvalid("工作路径最长 256 个字符")
	}
	if in.Nodes < 1 {
		return nil, errInvalid("请填写有效的节点数")
	}
	if in.GpusPerNode < 1 {
		return nil, errInvalid("请填写有效的每节点 GPU 数")
	}
	if in.GpusPerNode > maxGpusPerNode {
		return nil, errInvalid("每节点 GPU 数不能超过 8")
	}
	if in.CPUPerNode < 1 {
		return nil, errInvalid("请填写有效的每节点 CPU 核数")
	}
	if in.MemGiPerNode < 1 {
		return nil, errInvalid("请填写有效的每节点内存")
	}
	image := strings.TrimSpace(in.Image)
	if !validImage(image) {
		return nil, errInvalid("请填写完整镜像地址，例如 harbor.msxf.com/ai/megatron:24.07")
	}
	command := strings.TrimSpace(in.Command)
	if command == "" {
		return nil, errInvalid("请填写启动命令")
	}
	if in.TeamID <= 0 {
		return nil, errInvalid("请选择所属团队")
	}
	if !in.Actor.IsAdmin {
		ids, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, err
		}
		if !containsID(ids, in.TeamID) {
			return nil, errInvalid("只能使用自己加入的团队")
		}
	}
	names, err := s.teamSvc.MapByIDs(ctx, []int64{in.TeamID})
	if err != nil {
		return nil, err
	}
	teamRef, ok := names[in.TeamID]
	if !ok {
		return nil, errInvalid("请选择所属团队")
	}
	q, err := s.queueSvc.Get(ctx, in.QueueID)
	if err != nil {
		return nil, errInvalid("请选择资源队列")
	}
	if q.ClusterID != in.ClusterID {
		return nil, errInvalid("队列不属于当前工作集群")
	}
	if !q.Enabled || q.SyncError != "" {
		return nil, errInvalid("该队列不可用，请选择已启用且同步正常的队列")
	}
	teamOK := false
	for _, t := range q.Teams {
		if t.ID == in.TeamID {
			teamOK = true
			break
		}
	}
	if !teamOK {
		return nil, errInvalid("所选队列未关联该团队")
	}
	ownerID := in.Actor.UserID
	ownerUser := in.Actor.Username
	ownerNick := in.Actor.Nickname
	if in.Actor.IsAdmin {
		if in.RunUserID <= 0 {
			return nil, errInvalid("请检索并指定运行用户。本地 admin 不在 LDAP 中，不能作为运行身份。")
		}
		runUser, err := s.userSvc.GetEnabled(ctx, in.RunUserID)
		if err != nil {
			return nil, errInvalid("请检索并指定运行用户。本地 admin 不在 LDAP 中，不能作为运行身份。")
		}
		ownerID = runUser.ID
		ownerUser = runUser.Username
		ownerNick = runUser.Nickname
	}
	envMap := map[string]string{}
	for _, e := range in.Env {
		key := strings.TrimSpace(e.Key)
		if key == "" {
			continue
		}
		envMap[key] = e.Value
	}
	mounts, err := s.resolveMounts(ctx, in.Actor, in.TeamID, ownerUser, name, in.Mounts)
	if err != nil {
		return nil, err
	}
	requireIB := false
	for _, f := range q.Features {
		if f == featureIB {
			requireIB = true
			break
		}
	}
	return &preparedCreate{
		name:         name,
		teamID:       in.TeamID,
		teamName:     teamRef.Name,
		queueID:      q.ID,
		queueName:    q.Name,
		queueDisplay: q.DisplayName,
		datacenter:   q.DatacenterCode,
		gpuType:      q.GPUType,
		requireIB:    requireIB,
		priority:     priority,
		nodes:        in.Nodes,
		gpusPerNode:  in.GpusPerNode,
		gpuCount:     in.Nodes * in.GpusPerNode,
		cpuPerNode:   in.CPUPerNode,
		memGiPerNode: in.MemGiPerNode,
		image:        image,
		command:      command,
		workdir:      workdir,
		envMap:       envMap,
		mounts:       mounts,
		ownerID:      ownerID,
		ownerUser:    ownerUser,
		ownerNick:    ownerNick,
		rerunFrom:    in.RerunFromID,
	}, nil
}

func (s *serviceImpl) resolveMounts(ctx context.Context, actor Actor, teamID int64, username, jobName string, ins []MountInput) ([]Mount, error) {
	out := make([]Mount, 0, len(ins))
	paths := map[string]struct{}{}
	for _, in := range ins {
		if in.SetID <= 0 || in.Version <= 0 {
			return nil, errInvalid("请选择配置集，或删除空的挂载卡片")
		}
		path := strings.TrimSpace(in.MountPath)
		if path == "" {
			path = fmt.Sprintf("/data/hpc/home/%s/experiments/%s/configs", username, jobName)
		}
		if _, ok := paths[path]; ok {
			return nil, errInvalid("配置挂载路径冲突")
		}
		paths[path] = struct{}{}
		set, files, err := s.cfgSvc.Snapshot(ctx, in.SetID, in.Version)
		if err != nil {
			return nil, errInvalid("配置集或版本不存在")
		}
		if set.Status != configStatusActive {
			return nil, errInvalid("归档配置不能挂到新任务")
		}
		if set.TeamID != teamID && set.Visibility != configVisPrivate {
			return nil, errInvalid("只能挂载所属团队的配置集")
		}
		if set.Visibility == configVisPrivate && set.OwnerUsername != actor.Username && !actor.IsAdmin {
			return nil, errInvalid("无权使用该私有配置集")
		}
		mount := Mount{
			SetID:       set.ID,
			SetName:     set.Name,
			DisplayName: set.DisplayName,
			Version:     in.Version,
			MountPath:   path,
			Digest:      "",
			Files:       make([]MountFile, 0, len(files)),
		}
		for _, f := range files {
			mount.Files = append(mount.Files, MountFile{Path: f.Path, Content: f.Content, Size: len([]byte(f.Content))})
		}
		out = append(out, mount)
	}
	return out, nil
}

func (s *serviceImpl) rollbackConfigMaps(ctx context.Context, client kube.ClusterClient, names []string) {
	for _, name := range names {
		if err := client.DeleteConfigMap(ctx, consts.TrainingNamespace, name); err != nil {
			logger.Warningf(ctx, "rollback configmap %s: %v", name, err)
		}
	}
}

func buildVolcanoJob(p *preparedCreate, cmNames []string) *batchv1alpha1.Job {
	ns := consts.TrainingNamespace
	masterAddr := fmt.Sprintf("%s-%s-0.%s", p.name, consts.TrainingTaskName, p.name)
	env := []corev1.EnvVar{
		{Name: "GPU_NUM", Value: fmt.Sprintf("%d", p.gpusPerNode)},
		{Name: "WORLD_SIZE", Value: fmt.Sprintf("%d", p.nodes)},
		{Name: "MASTER_PORT", Value: consts.TrainingMasterPort},
		{Name: "MASTER_ADDR", Value: masterAddr},
	}
	for k, v := range p.envMap {
		env = append(env, corev1.EnvVar{Name: k, Value: v})
	}
	res := corev1.ResourceList{
		corev1.ResourceCPU:                          resource.MustParse(fmt.Sprintf("%d", p.cpuPerNode)),
		corev1.ResourceMemory:                       resource.MustParse(fmt.Sprintf("%dGi", p.memGiPerNode)),
		corev1.ResourceName(consts.GPUResourceName): resource.MustParse(fmt.Sprintf("%d", p.gpusPerNode)),
	}
	selector := map[string]string{}
	if p.datacenter != "" {
		selector[consts.LabelKeyDatacenter] = p.datacenter
	}
	if p.gpuType != "" {
		selector[consts.LabelKeyGPUType] = p.gpuType
	}
	var volumes []corev1.Volume
	var mounts []corev1.VolumeMount
	for i, cmName := range cmNames {
		volName := fmt.Sprintf("cfg-%d", i)
		items := make([]corev1.KeyToPath, 0, len(p.mounts[i].Files))
		for _, file := range p.mounts[i].Files {
			items = append(items, corev1.KeyToPath{Key: configMapKey(file.Path), Path: file.Path})
		}
		volumes = append(volumes, corev1.Volume{
			Name: volName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{Name: cmName},
					Items:                items,
				},
			},
		})
		mounts = append(mounts, corev1.VolumeMount{Name: volName, MountPath: p.mounts[i].MountPath, ReadOnly: true})
	}
	script := "export RANK=${VK_TASK_INDEX:-0}\n" + p.command
	podSpec := corev1.PodSpec{
		RestartPolicy: corev1.RestartPolicyNever,
		SchedulerName: "volcano",
		Containers: []corev1.Container{{
			Name:         consts.TrainingContainerName,
			Image:        p.image,
			Command:      []string{"/bin/bash", "-lc", script},
			WorkingDir:   p.workdir,
			Env:          env,
			Resources:    corev1.ResourceRequirements{Limits: res, Requests: res},
			VolumeMounts: mounts,
		}},
		Volumes: volumes,
	}
	if len(selector) > 0 {
		podSpec.NodeSelector = selector
	}
	replicas := int32(p.nodes)
	minAvail := replicas
	return &batchv1alpha1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.name,
			Namespace: ns,
			Labels: map[string]string{
				consts.LabelKeyManaged: "true",
				consts.LabelKeyOwner:   p.ownerUser,
				consts.LabelKeyTeamID:  fmt.Sprintf("%d", p.teamID),
			},
			Annotations: map[string]string{
				consts.AnnotationKeyPriority: p.priority,
			},
		},
		Spec: batchv1alpha1.JobSpec{
			MinAvailable:  minAvail,
			SchedulerName: "volcano",
			Queue:         p.queueName,
			MaxRetry:      1,
			Plugins: map[string][]string{
				"env": {},
				"svc": {},
			},
			Policies: []batchv1alpha1.LifecyclePolicy{
				{Event: busv1alpha1.PodEvictedEvent, Action: busv1alpha1.RestartJobAction},
				{Event: busv1alpha1.PodFailedEvent, Action: busv1alpha1.AbortJobAction},
			},
			Tasks: []batchv1alpha1.TaskSpec{{
				Name:     consts.TrainingTaskName,
				Replicas: replicas,
				Template: corev1.PodTemplateSpec{Spec: podSpec},
			}},
		},
	}
}

func validImage(image string) bool {
	if image == "" || strings.ContainsAny(image, " \t") {
		return false
	}
	if strings.HasPrefix(image, "/") || strings.HasSuffix(image, "/") {
		return false
	}
	return strings.Contains(image, "/")
}

func configMapName(job string, idx int) string {
	return fmt.Sprintf("%s-cfg-%d", job, idx)
}

func configMapKey(path string) string {
	key := strings.ReplaceAll(path, "/", "__")
	if key == "" {
		key = "file"
	}
	return key
}

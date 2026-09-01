// 本文件实现队列创建、更新、启停、删除及与 Volcano 的同步。

package queue

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Create 先写 Volcano Queue，再落库。
func (s *serviceImpl) Create(ctx context.Context, in WriteInput) (int64, error) {
	prepared, err := s.prepareWrite(ctx, in, 0)
	if err != nil {
		return 0, err
	}
	exists, err := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{ClusterId: in.ClusterID, Name: prepared.name}).Count()
	if err != nil {
		return 0, gerror.Wrap(err, "check queue name")
	}
	if exists > 0 {
		return 0, bizerr.New(CodeNameExists)
	}
	client, err := s.clusterSvc.Client(ctx, in.ClusterID)
	if err != nil {
		return 0, err
	}
	if err := client.ApplyQueue(ctx, prepared.spec); err != nil {
		return 0, err
	}
	var id int64
	err = dao.OpsQueue.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		var insErr error
		id, insErr = dao.OpsQueue.Ctx(ctx).Data(prepared.row).InsertAndGetId()
		if insErr != nil {
			return gerror.Wrap(insErr, "insert queue")
		}
		return s.replaceTeams(ctx, id, prepared.teamIDs)
	})
	if err != nil {
		if delErr := client.DeleteQueue(ctx, prepared.name); delErr != nil {
			logger.Warningf(ctx, "rollback volcano queue %s: %v", prepared.name, delErr)
		}
		return 0, err
	}
	logger.Infof(ctx, "created queue %s id=%d cluster=%d", prepared.name, id, in.ClusterID)
	return id, nil
}

// Update 更新业务字段并同步 CR。
func (s *serviceImpl) Update(ctx context.Context, id int64, in WriteInput) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	in.ClusterID = row.ClusterId
	in.Name = row.Name
	prepared, err := s.prepareWrite(ctx, in, id)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	if err := client.ApplyQueue(ctx, prepared.spec); err != nil {
		return err
	}
	prepared.row.Name = nil
	prepared.row.ClusterId = nil
	err = dao.OpsQueue.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		if _, updErr := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{Id: id}).Data(prepared.row).Update(); updErr != nil {
			return gerror.Wrap(updErr, "update queue")
		}
		return s.replaceTeams(ctx, id, prepared.teamIDs)
	})
	if err != nil {
		return err
	}
	logger.Infof(ctx, "updated queue %s id=%d", row.Name, id)
	return nil
}

// Resync 按库中元数据创建或更新 Volcano Queue。
func (s *serviceImpl) Resync(ctx context.Context, id int64) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	if err := client.ApplyQueue(ctx, specFromRow(row)); err != nil {
		return err
	}
	logger.Infof(ctx, "resynced queue %s id=%d", row.Name, id)
	return nil
}

func specFromRow(row *entity.OpsQueue) kube.QueueSpec {
	weight := int32(row.Weight)
	if weight < 1 {
		weight = 1
	}
	return kube.QueueSpec{
		Name:        row.Name,
		Weight:      weight,
		Reclaimable: row.Reclaimable,
		CPUQuota:    row.CpuQuota,
		MemQuotaGi:  row.MemQuotaGi,
		GPUQuota:    row.GpuQuota,
		Datacenter:  row.DatacenterCode,
		GPUType:     row.GpuType,
		Features:    parseFeatures(row.Features),
	}
}

// UpdateStatus 映射 Open/Closed。
func (s *serviceImpl) UpdateStatus(ctx context.Context, id int64, enabled bool) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	if err := client.SetQueueState(ctx, row.Name, enabled); err != nil {
		return err
	}
	return nil
}

// Delete 在无占用时删除 CR 与业务行。
func (s *serviceImpl) Delete(ctx context.Context, id int64) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	client, err := s.clusterSvc.Client(ctx, row.ClusterId)
	if err != nil {
		return err
	}
	snap, qerr := client.GetQueue(ctx, row.Name)
	if qerr != nil && !bizerr.Is(qerr, kube.CodeQueueNotFound) {
		return qerr
	}
	if snap != nil && (snap.Running > 0 || snap.Pending > 0) {
		return bizerr.New(CodeBusy)
	}
	if err := client.DeleteQueue(ctx, row.Name); err != nil {
		return err
	}
	err = dao.OpsQueue.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		if _, delErr := dao.OpsQueueTeam.Ctx(ctx).Where(do.OpsQueueTeam{QueueId: id}).Delete(); delErr != nil {
			return gerror.Wrap(delErr, "delete queue teams")
		}
		if _, delErr := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{Id: id}).Delete(); delErr != nil {
			return gerror.Wrap(delErr, "delete queue")
		}
		return nil
	})
	if err != nil {
		return err
	}
	logger.Infof(ctx, "deleted queue %s id=%d", row.Name, id)
	return nil
}

type preparedWrite struct {
	name    string
	spec    kube.QueueSpec
	row     do.OpsQueue
	teamIDs []int64
}

func (s *serviceImpl) prepareWrite(ctx context.Context, in WriteInput, excludeID int64) (*preparedWrite, error) {
	name, err := normalizeDNS1123(in.Name)
	if err != nil {
		return nil, err
	}
	display := strings.TrimSpace(in.DisplayName)
	if display == "" {
		return nil, errInvalid("请填写显示名称")
	}
	dc, err := s.dcSvc.GetByCode(ctx, strings.TrimSpace(in.DatacenterCode))
	if err != nil {
		return nil, err
	}
	gpuType := strings.TrimSpace(in.GPUType)
	if gpuType == "" {
		return nil, errInvalid("请选择 GPU 型号")
	}
	if in.GPUQuota < 0 || in.CPUQuota < 0 || in.MemQuotaGi < 0 {
		return nil, errInvalid("额度不能为负数")
	}
	features := normalizeFeatures(in.Features)
	if err := s.ensureQuotaFits(ctx, in.ClusterID, dc.Code, features, gpuType, in.GPUQuota, in.CPUQuota, in.MemQuotaGi, excludeID); err != nil {
		return nil, err
	}
	teamIDs, err := s.normalizeTeamIDs(ctx, in.TeamIDs)
	if err != nil {
		return nil, err
	}
	weight := in.Weight
	if weight < 1 {
		weight = 1
	}
	reclaimable := true
	if in.Reclaimable != nil {
		reclaimable = *in.Reclaimable
	}
	featJSON, err := json.Marshal(features)
	if err != nil {
		return nil, gerror.Wrap(err, "marshal queue features")
	}
	return &preparedWrite{
		name: name,
		spec: kube.QueueSpec{
			Name:        name,
			Weight:      int32(weight),
			Reclaimable: reclaimable,
			CPUQuota:    in.CPUQuota,
			MemQuotaGi:  in.MemQuotaGi,
			GPUQuota:    in.GPUQuota,
			Datacenter:  dc.Code,
			GPUType:     gpuType,
			Features:    features,
		},
		row: do.OpsQueue{
			ClusterId:      in.ClusterID,
			Name:           name,
			DisplayName:    display,
			DatacenterCode: dc.Code,
			GpuType:        gpuType,
			GpuQuota:       in.GPUQuota,
			CpuQuota:       in.CPUQuota,
			MemQuotaGi:     in.MemQuotaGi,
			Weight:         weight,
			Reclaimable:    reclaimable,
			Features:       string(featJSON),
			Description:    strings.TrimSpace(in.Description),
		},
		teamIDs: teamIDs,
	}, nil
}

// normalizeTeamIDs 去重并校验团队存在。空列表表示不绑定团队。
func (s *serviceImpl) normalizeTeamIDs(ctx context.Context, ids []int64) ([]int64, error) {
	seen := map[int64]struct{}{}
	var out []int64
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	if len(out) == 0 {
		return []int64{}, nil
	}
	if len(out) > maxTeamIDs {
		return nil, errInvalid("单次最多关联 100 个团队")
	}
	found, err := s.teamSvc.MapByIDs(ctx, out)
	if err != nil {
		return nil, err
	}
	if len(found) != len(out) {
		return nil, errInvalid("所选团队不存在")
	}
	return out, nil
}

func (s *serviceImpl) replaceTeams(ctx context.Context, queueID int64, teamIDs []int64) error {
	if _, err := dao.OpsQueueTeam.Ctx(ctx).Where(do.OpsQueueTeam{QueueId: queueID}).Delete(); err != nil {
		return gerror.Wrap(err, "clear queue teams")
	}
	for _, teamID := range teamIDs {
		if _, err := dao.OpsQueueTeam.Ctx(ctx).Data(do.OpsQueueTeam{QueueId: queueID, TeamId: teamID}).Insert(); err != nil {
			return gerror.Wrap(err, "insert queue team")
		}
	}
	return nil
}

// ReplaceQueuesForTeam 按队列 ID 全量替换该团队绑定。
func (s *serviceImpl) ReplaceQueuesForTeam(ctx context.Context, teamID int64, queueIDs []int64) error {
	ids, err := s.normalizeBindQueueIDs(ctx, queueIDs)
	if err != nil {
		return err
	}
	err = dao.OpsQueueTeam.Transaction(ctx, func(ctx context.Context, _ gdb.TX) error {
		if _, delErr := dao.OpsQueueTeam.Ctx(ctx).Where(do.OpsQueueTeam{TeamId: teamID}).Delete(); delErr != nil {
			return gerror.Wrap(delErr, "clear team queues")
		}
		for _, queueID := range ids {
			if _, insErr := dao.OpsQueueTeam.Ctx(ctx).Data(do.OpsQueueTeam{QueueId: queueID, TeamId: teamID}).Insert(); insErr != nil {
				return gerror.Wrap(insErr, "insert team queue")
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	logger.Infof(ctx, "replaced queues for team %d count=%d", teamID, len(ids))
	return nil
}

func (s *serviceImpl) normalizeBindQueueIDs(ctx context.Context, ids []int64) ([]int64, error) {
	seen := map[int64]struct{}{}
	var out []int64
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	if len(out) == 0 {
		return []int64{}, nil
	}
	if len(out) > maxTeamIDs {
		return nil, errInvalid("单次最多关联 100 个队列")
	}
	n, err := dao.OpsQueue.Ctx(ctx).WhereIn(dao.OpsQueue.Columns().Id, out).Count()
	if err != nil {
		return nil, gerror.Wrap(err, "count bind queues")
	}
	if n != len(out) {
		return nil, errInvalid("所选队列不存在")
	}
	return out, nil
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.OpsQueue, error) {
	var row *entity.OpsQueue
	err := dao.OpsQueue.Ctx(ctx).Where(do.OpsQueue{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get queue")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

// 本文件实现集群接入、编辑、探测与删除。

package cluster

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gtime"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// Create 探测成功后写入集群。
func (s *serviceImpl) Create(ctx context.Context, in CreateInput) (int64, error) {
	display := strings.TrimSpace(in.DisplayName)
	kubeconfig := strings.TrimSpace(in.Kubeconfig)
	if display == "" {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写显示名称"))
	}
	if kubeconfig == "" {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写 Kubeconfig"))
	}
	if len(kubeconfig) > maxKubeYAML {
		return 0, bizerr.New(CodeInvalidInput, bizerr.P("message", "Kubeconfig 内容过长"))
	}
	if err := s.ensureDisplayFree(ctx, display, 0); err != nil {
		return 0, err
	}
	client, err := s.factory.ClientFor(ctx, []byte(kubeconfig))
	if err != nil {
		return 0, err
	}
	probe, err := client.Probe(ctx)
	if err != nil {
		return 0, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "无法使用该 Kubeconfig 连接集群"))
	}
	name, err := s.uniqueName(ctx, slugName(display))
	if err != nil {
		return 0, err
	}
	now := gtime.Now()
	id, err := dao.OpsCluster.Ctx(ctx).Data(do.OpsCluster{
		Name:        name,
		DisplayName: display,
		Description: strings.TrimSpace(in.Description),
		Kubeconfig:  kubeconfig,
		ApiServer:   probe.APIServer,
		K8SVersion:  probe.Version,
		Status:      string(StatusHealthy),
		LastSyncAt:  now,
	}).InsertAndGetId()
	if err != nil {
		return 0, gerror.Wrap(err, "create cluster")
	}
	s.mu.Lock()
	s.clients[id] = client
	s.mu.Unlock()
	logger.Infof(ctx, "connected cluster %s id=%d version=%s", name, id, probe.Version)
	return id, nil
}

// Update 修改显示信息，可选覆盖凭证。
func (s *serviceImpl) Update(ctx context.Context, in UpdateInput) error {
	row, err := s.mustGet(ctx, in.ID)
	if err != nil {
		return err
	}
	display := strings.TrimSpace(in.DisplayName)
	if display == "" {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "请填写显示名称"))
	}
	if err := s.ensureDisplayFree(ctx, display, in.ID); err != nil {
		return err
	}
	kubeconfig := strings.TrimSpace(in.Kubeconfig)
	data := do.OpsCluster{
		DisplayName: display,
		Description: strings.TrimSpace(in.Description),
	}
	if kubeconfig != "" {
		if len(kubeconfig) > maxKubeYAML {
			return bizerr.New(CodeInvalidInput, bizerr.P("message", "Kubeconfig 内容过长"))
		}
		client, err := s.factory.ClientFor(ctx, []byte(kubeconfig))
		if err != nil {
			return err
		}
		probe, err := client.Probe(ctx)
		if err != nil {
			return bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "无法使用该 Kubeconfig 连接集群"))
		}
		data.Kubeconfig = kubeconfig
		data.ApiServer = probe.APIServer
		data.K8SVersion = probe.Version
		data.Status = string(StatusHealthy)
		data.LastSyncAt = gtime.Now()
		s.dropClient(in.ID)
		s.mu.Lock()
		s.clients[in.ID] = client
		s.mu.Unlock()
	}
	if _, err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Id: in.ID}).Data(data).Update(); err != nil {
		return gerror.Wrap(err, "update cluster")
	}
	logger.Infof(ctx, "updated cluster %s id=%d", row.Name, in.ID)
	return nil
}

// Probe 连通测试并刷新状态。
func (s *serviceImpl) Probe(ctx context.Context, id int64) (*Item, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	client, err := s.clientForRow(ctx, row)
	if err != nil {
		s.markOffline(ctx, row.Id)
		return nil, err
	}
	probe, err := client.Probe(ctx)
	if err != nil {
		s.markOffline(ctx, row.Id)
		return nil, bizerr.Wrap(err, CodeUnreachable, bizerr.P("message", "集群不可达"))
	}
	now := gtime.Now()
	if _, err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Id: id}).Data(do.OpsCluster{
		ApiServer:  probe.APIServer,
		K8SVersion: probe.Version,
		Status:     string(StatusHealthy),
		LastSyncAt: now,
	}).Update(); err != nil {
		return nil, gerror.Wrap(err, "save cluster probe")
	}
	row.ApiServer = probe.APIServer
	row.K8SVersion = probe.Version
	row.Status = string(StatusHealthy)
	row.LastSyncAt = now
	item, err := s.projectOne(ctx, row)
	if err != nil {
		return nil, err
	}
	return item, nil
}

// Delete 软删除集群并丢弃客户端缓存。
func (s *serviceImpl) Delete(ctx context.Context, id int64) error {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return err
	}
	if _, err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Id: id}).Delete(); err != nil {
		return gerror.Wrap(err, "delete cluster")
	}
	s.dropClient(id)
	logger.Infof(ctx, "deleted cluster %s id=%d", row.Name, id)
	return nil
}

func (s *serviceImpl) markOffline(ctx context.Context, id int64) {
	if _, err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Id: id}).Data(do.OpsCluster{
		Status: string(StatusOffline),
	}).Update(); err != nil {
		logger.Warningf(ctx, "mark cluster %d offline: %v", id, err)
	}
	s.dropClient(id)
}

func (s *serviceImpl) ensureDisplayFree(ctx context.Context, display string, excludeID int64) error {
	mod := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{DisplayName: display})
	if excludeID > 0 {
		mod = mod.WhereNot(dao.OpsCluster.Columns().Id, excludeID)
	}
	n, err := mod.Count()
	if err != nil {
		return gerror.Wrap(err, "check cluster display name")
	}
	if n > 0 {
		return bizerr.New(CodeNameExists)
	}
	return nil
}

func (s *serviceImpl) uniqueName(ctx context.Context, base string) (string, error) {
	name := base
	for i := 2; i < 50; i++ {
		n, err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Name: name}).Count()
		if err != nil {
			return "", gerror.Wrap(err, "check cluster name")
		}
		if n == 0 {
			return name, nil
		}
		name = base + "-" + itoa(i)
	}
	return "", bizerr.New(CodeInvalidInput, bizerr.P("message", "集群名称冲突"))
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [8]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func (s *serviceImpl) projectOne(ctx context.Context, row *entity.OpsCluster) (*Item, error) {
	items, err := s.projectItems(ctx, []*entity.OpsCluster{row})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, bizerr.New(CodeNotFound)
	}
	return items[0], nil
}

func unixMilliOrZero(t *gtime.Time) int64 {
	return model.UnixMilli(t)
}

func parseStatus(raw string) kube.Status {
	switch Status(raw) {
	case StatusHealthy, StatusOffline, StatusUnknown:
		return Status(raw)
	default:
		return StatusUnknown
	}
}

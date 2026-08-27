// 本文件缓存并构造集群 Kubernetes 客户端。

package cluster

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/kube"
	"github.com/gqcn/ltp/pkg/bizerr"
)

// Client 返回指定集群的 Kubernetes 客户端。
func (s *serviceImpl) Client(ctx context.Context, id int64) (kube.ClusterClient, error) {
	row, err := s.mustGet(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.clientForRow(ctx, row)
}

func (s *serviceImpl) clientForRow(ctx context.Context, row *entity.OpsCluster) (kube.ClusterClient, error) {
	s.mu.Lock()
	if c, ok := s.clients[row.Id]; ok {
		s.mu.Unlock()
		return c, nil
	}
	s.mu.Unlock()
	c, err := s.factory.ClientFor(ctx, []byte(row.Kubeconfig))
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing, ok := s.clients[row.Id]; ok {
		return existing, nil
	}
	s.clients[row.Id] = c
	return c, nil
}

func (s *serviceImpl) dropClient(id int64) {
	s.mu.Lock()
	delete(s.clients, id)
	s.dropInspect(id)
	s.mu.Unlock()
}

func (s *serviceImpl) mustGet(ctx context.Context, id int64) (*entity.OpsCluster, error) {
	var row *entity.OpsCluster
	err := dao.OpsCluster.Ctx(ctx).Where(do.OpsCluster{Id: id}).Scan(&row)
	if err != nil {
		return nil, gerror.Wrap(err, "get cluster")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

func normalizePage(pageNum int, pageSize int) (int, int) {
	if pageNum < 1 {
		pageNum = defaultListNum
	}
	if pageSize < 1 {
		pageSize = defaultPageSz
	}
	if pageSize > maxListSize {
		pageSize = maxListSize
	}
	return pageNum, pageSize
}

func slugName(display string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(strings.TrimSpace(display)) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '_' || r == '-' || r == '.':
			if b.Len() > 0 {
				b.WriteByte('-')
			}
		}
	}
	name := strings.Trim(b.String(), "-")
	for strings.Contains(name, "--") {
		name = strings.ReplaceAll(name, "--", "-")
	}
	if name == "" {
		name = "cluster"
	}
	if len(name) > 48 {
		name = name[:48]
	}
	return name
}

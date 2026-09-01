// 本文件实现团队侧队列绑定的委托与候选项查询。

package team

import (
	"context"

	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

// ListQueueOptions 返回可供绑定的队列候选项。
func (s *serviceImpl) ListQueueOptions(ctx context.Context, keyword string, pageNum, pageSize int) ([]QueueOption, int, error) {
	if s.queues == nil {
		return []QueueOption{}, 0, nil
	}
	return s.queues.ListBindOptions(ctx, keyword, pageNum, pageSize)
}

// SetQueues 全量替换团队关联队列。
func (s *serviceImpl) SetQueues(ctx context.Context, teamID int64, queueIDs []int64) error {
	if _, err := s.mustGet(ctx, teamID); err != nil {
		return err
	}
	if s.queues == nil {
		return bizerr.New(CodeInvalidInput, bizerr.P("message", "队列模块未启用"))
	}
	if err := s.queues.ReplaceQueuesForTeam(ctx, teamID, queueIDs); err != nil {
		return err
	}
	logger.Infof(ctx, "set queues for team %d count=%d", teamID, len(queueIDs))
	return nil
}

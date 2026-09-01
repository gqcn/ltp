// 本文件实现实验 Run 的移动项目与删除。

package exprun

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
)

// Move 把可见 Run 移动到目标项目。
func (s *serviceImpl) Move(ctx context.Context, actor Actor, id, projectID int64) error {
	if _, err := s.mustVisible(ctx, actor, id); err != nil {
		return err
	}
	if projectID <= 0 {
		return errInvalid("请选择实验项目")
	}
	if _, err := s.projectSvc.Get(ctx, projectID); err != nil {
		return err
	}
	if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: id}).Data(do.ExpRun{ProjectId: projectID}).Update(); err != nil {
		return gerror.Wrap(err, "move exp run")
	}
	return nil
}

// Delete 软删除可见 Run。
func (s *serviceImpl) Delete(ctx context.Context, actor Actor, id int64) error {
	if _, err := s.mustVisible(ctx, actor, id); err != nil {
		return err
	}
	if _, err := dao.ExpRun.Ctx(ctx).Where(do.ExpRun{Id: id}).Delete(); err != nil {
		return gerror.Wrap(err, "delete exp run")
	}
	return nil
}

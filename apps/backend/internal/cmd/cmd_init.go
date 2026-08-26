// 本文件实现数据库初始化与可选 Mock 加载。

package cmd

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/os/gcmd"
	"github.com/gogf/gf/v2/os/gfile"

	"github.com/gqcn/ltp/pkg/logger"
)

var initCmd = gcmd.Command{
	Name:  "init",
	Usage: "init",
	Brief: "执行 manifest/sql 中的 DDL 与必需种子数据",
	Func:  initFunc,
}

var mockCmd = gcmd.Command{
	Name:  "mock",
	Usage: "mock",
	Brief: "加载 manifest/sql/mock-data 中的可选 Mock 数据",
	Func:  mockFunc,
}

func initFunc(ctx context.Context, _ *gcmd.Parser) error {
	dir := gfile.Join(gfile.Pwd(), "manifest", "sql")
	if err := execSQLDir(ctx, dir); err != nil {
		return gerror.Wrap(err, "database init failed")
	}
	logger.Info(ctx, "database init completed")
	return nil
}

func mockFunc(ctx context.Context, _ *gcmd.Parser) error {
	dir := gfile.Join(gfile.Pwd(), "manifest", "sql", "mock-data")
	if err := execSQLDir(ctx, dir); err != nil {
		return gerror.Wrap(err, "mock data load failed")
	}
	logger.Info(ctx, "mock data load completed")
	return nil
}

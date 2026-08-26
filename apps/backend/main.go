// 命令 ltp 启动大模型训练平台 HTTP 服务，并提供数据库初始化与 Mock 子命令。
// PostgreSQL 驱动必须在 main 中以空白导入注册，生成的 DAO 才能打开连接。
package main

import (
	_ "github.com/gogf/gf/contrib/drivers/pgsql/v2"

	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/cmd"
	_ "github.com/gqcn/ltp/internal/packed"
)

func main() {
	cmd.Main.Run(gctx.GetInitCtx())
}

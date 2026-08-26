// Package cmd 负责进程入口：HTTP 服务、SQL 初始化与 Mock 加载。
package cmd

import (
	"github.com/gogf/gf/v2/os/gcmd"
)

// Main 是默认进程命令。不带子命令运行二进制时启动 HTTP 服务；init 与 mock 子命令维护数据库。
var Main = gcmd.Command{
	Name:  "main",
	Usage: "main",
	Brief: "启动 LTP HTTP 服务",
	Func:  httpFunc,
}

func init() {
	if err := Main.AddCommand(&initCmd, &mockCmd); err != nil {
		panic(err)
	}
}

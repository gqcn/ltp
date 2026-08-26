.PHONY: help

## help: 显示可用 Make 目标
help:
	@echo "LTP 开发目标"
	@echo "  make db.up       等待本机 PostgreSQL 并确保存在数据库 ltp"
	@echo "  make db.init     执行 DDL 与种子数据"
	@echo "  make db.mock     加载可选 Mock 数据中心"
	@echo "  make dao         在 apps/backend 生成 DAO/DO/Entity"
	@echo "  make ctrl        根据 apps/backend/api 生成控制器"
	@echo "  make lint        运行 golangci-lint"
	@echo "  make test.unit   运行 Go 单元测试"
	@echo "  make test.e2e    从 hack/tests 运行 Playwright E2E"
	@echo "  make dev         启动后端与前端"
	@echo "  make stop        停止本地进程"

## help: 显示可用 Make 目标
.PHONY: help
help:
	@echo "LTP 开发目标"
	@echo "  make db.up       等待本机 PostgreSQL 并确保存在数据库 ltp"
	@echo "  make db.init     执行 DDL 与种子数据"
	@echo "  make db.mock     加载可选 Mock 数据"
	@echo "  make ldap.up     启动 Docker 模拟 LDAP（127.0.0.1:1389）"
	@echo "  make ldap.down   停止模拟 LDAP"
	@echo "  make kind.up     创建 Kubernetes 1.27 的 kind 集群（模拟 GPU 节点）并安装 Volcano 1.13"
	@echo "  make kind.down   删除本地 kind 集群"
	@echo "  make dao         在 apps/backend 生成 DAO/DO/Entity"
	@echo "  make ctrl        根据 apps/backend/api 生成控制器"
	@echo "  make lint        运行 golangci-lint"
	@echo "  make test.unit   运行 Go 单元测试"
	@echo "  make test.e2e    从 hack/tests 运行 Playwright E2E"
	@echo "  make dev         启动后端与前端，并以 make status 展示状态"
	@echo "  make status      查看前后端、数据库与依赖服务状态"
	@echo "  make stop        停止后端与前端（不停 PostgreSQL / LDAP）"

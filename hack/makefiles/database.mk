## db.up: 等待本机 PostgreSQL 就绪，并确保存在数据库 ltp
.PHONY: db.up
db.up:
	@if [ -z "$(PSQL)" ]; then echo "未找到 psql。请安装 PostgreSQL 客户端或 Postgres.app。"; exit 1; fi
	@$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c 'SELECT 1' >/dev/null
	@$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='$(PGDATABASE)'" | grep -q 1 || \
		$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "CREATE DATABASE $(PGDATABASE)"

## db.down: 本机 PostgreSQL 不由 Make 管理
.PHONY: db.down
db.down:
	@echo "Make 不会停止本机 PostgreSQL。数据库 $(PGDATABASE)（$(PGHOST):$(PGPORT)）保持原样。"

## db.init: 执行宿主 DDL 与种子数据
.PHONY: db.init
db.init: db.up
	@cd $(BACKEND_DIR) && go run . init

## db.mock: 加载可选原型数据中心
.PHONY: db.mock
db.mock: db.up
	@cd $(BACKEND_DIR) && go run . mock

## ldap.up: 启动本地模拟 LDAP
.PHONY: ldap.up
ldap.up:
	@docker compose -f $(ROOT_DIR)/hack/deploy/docker-compose.yml up -d ldap
	@echo "LDAP ldap://127.0.0.1:1389  BaseDN=dc=msxf,dc=com  BindDN=cn=admin,dc=msxf,dc=com"

## ldap.down: 停止本地模拟 LDAP
.PHONY: ldap.down
ldap.down:
	@docker compose -f $(ROOT_DIR)/hack/deploy/docker-compose.yml stop ldap

## kind.up: 创建 Kubernetes 1.27 的 kind 集群（含模拟 GPU 工作节点）并安装 Volcano 1.13
.PHONY: kind.up
kind.up:
	@bash "$(ROOT_DIR)/hack/deploy/kind/up.sh"

## kind.down: 删除本地 kind 集群
.PHONY: kind.down
kind.down:
	@bash "$(ROOT_DIR)/hack/deploy/kind/down.sh"

## dao: 生成 DAO/DO/Entity
.PHONY: dao
dao:
	@$(MAKE) -C $(BACKEND_DIR) dao

## ctrl: 根据 API 契约生成控制器
.PHONY: ctrl
ctrl:
	@$(MAKE) -C $(BACKEND_DIR) ctrl

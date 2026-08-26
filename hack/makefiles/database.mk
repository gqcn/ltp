.PHONY: db.up db.down db.init db.mock dao ctrl ldap.up ldap.down

## db.up: 等待本机 PostgreSQL 就绪，并确保存在数据库 ltp
db.up:
	@if [ -z "$(PSQL)" ]; then echo "未找到 psql。请安装 PostgreSQL 客户端或 Postgres.app。"; exit 1; fi
	@$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c 'SELECT 1' >/dev/null
	@$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='$(PGDATABASE)'" | grep -q 1 || \
		$(PSQL) -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "CREATE DATABASE $(PGDATABASE)"

## db.down: 本机 PostgreSQL 不由 Make 管理
db.down:
	@echo "Make 不会停止本机 PostgreSQL。数据库 $(PGDATABASE)（$(PGHOST):$(PGPORT)）保持原样。"

## db.init: 执行宿主 DDL 与种子数据
db.init: db.up
	@cd $(BACKEND_DIR) && go run . init

## db.mock: 加载可选原型数据中心
db.mock: db.up
	@cd $(BACKEND_DIR) && go run . mock

## ldap.up: 启动本地模拟 LDAP
ldap.up:
	@docker compose -f $(ROOT_DIR)/hack/deploy/docker-compose.yml up -d ldap
	@echo "LDAP ldap://127.0.0.1:1389  BaseDN=dc=msxf,dc=com  BindDN=cn=admin,dc=msxf,dc=com"

## ldap.down: 停止本地模拟 LDAP
ldap.down:
	@docker compose -f $(ROOT_DIR)/hack/deploy/docker-compose.yml stop ldap

## dao: 生成 DAO/DO/Entity
dao:
	@$(MAKE) -C $(BACKEND_DIR) dao

## ctrl: 根据 API 契约生成控制器
ctrl:
	@$(MAKE) -C $(BACKEND_DIR) ctrl

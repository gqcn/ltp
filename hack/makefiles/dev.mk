## web.deps: 安装前端依赖
.PHONY: web.deps
web.deps:
	@cd $(FRONTEND_DIR) && pnpm install

## dev: 重启后端与前端，并以 make status 展示状态
.PHONY: dev
dev: stop ldap.up web.deps
	@mkdir -p $(TEMP_DIR)/bin $(PID_DIR)
	@cd $(BACKEND_DIR) && go build -o $(BACKEND_BIN) .
	@cd $(BACKEND_DIR) && nohup $(BACKEND_BIN) >$(BACKEND_LOG) 2>&1 & echo $$! > $(BACKEND_PID)
	@cd $(FRONTEND_DIR) && nohup pnpm dev >$(FRONTEND_LOG) 2>&1 & echo $$! > $(FRONTEND_PID)
	@i=0; \
	until [ $$i -ge 40 ] \
		|| { curl -sf --connect-timeout 1 --max-time 2 "http://127.0.0.1:$(BACKEND_PORT)/api/health" >/dev/null 2>&1 \
			&& curl -sf --connect-timeout 1 --max-time 2 "http://127.0.0.1:$(FRONTEND_PORT)/" >/dev/null 2>&1; }; do \
		sleep 0.25; \
		i=$$((i + 1)); \
	done
	@$(MAKE) --no-print-directory status

## stop: 停止后端与前端（含占端口的残留进程；不停 PostgreSQL / LDAP）
.PHONY: stop
stop:
	@ROOT_DIR="$(ROOT_DIR)" \
		BACKEND_PID="$(BACKEND_PID)" \
		FRONTEND_PID="$(FRONTEND_PID)" \
		BACKEND_PORT="$(BACKEND_PORT)" \
		FRONTEND_PORT="$(FRONTEND_PORT)" \
		bash "$(ROOT_DIR)/hack/scripts/stop.sh"

## status: 查看前后端、数据库与依赖服务运行情况
.PHONY: status
status:
	@ROOT_DIR="$(ROOT_DIR)" \
		BACKEND_PID="$(BACKEND_PID)" \
		FRONTEND_PID="$(FRONTEND_PID)" \
		BACKEND_LOG="$(BACKEND_LOG)" \
		FRONTEND_LOG="$(FRONTEND_LOG)" \
		BACKEND_PORT="$(BACKEND_PORT)" \
		FRONTEND_PORT="$(FRONTEND_PORT)" \
		PGHOST="$(PGHOST)" \
		PGPORT="$(PGPORT)" \
		PGUSER="$(PGUSER)" \
		PGDATABASE="$(PGDATABASE)" \
		PSQL="$(PSQL)" \
		COMPOSE_FILE="$(ROOT_DIR)/hack/deploy/docker-compose.yml" \
		bash "$(ROOT_DIR)/hack/scripts/status.sh"

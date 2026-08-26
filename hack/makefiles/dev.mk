.PHONY: web.deps dev stop

## web.deps: 安装前端依赖
web.deps:
	@cd $(FRONTEND_DIR) && pnpm install

## dev: 重启后端与前端
dev: stop db.init web.deps
	@mkdir -p $(TEMP_DIR)/bin $(PID_DIR)
	@cd $(BACKEND_DIR) && go build -o $(BACKEND_BIN) .
	@cd $(BACKEND_DIR) && nohup $(BACKEND_BIN) >$(BACKEND_LOG) 2>&1 & echo $$! > $(BACKEND_PID)
	@cd $(FRONTEND_DIR) && nohup pnpm dev >$(FRONTEND_LOG) 2>&1 & echo $$! > $(FRONTEND_PID)
	@echo "Backend  http://127.0.0.1:$(BACKEND_PORT)"
	@echo "Frontend http://127.0.0.1:$(FRONTEND_PORT)"

## stop: 停止后端与前端
stop:
	@if [ -f $(BACKEND_PID) ]; then kill `cat $(BACKEND_PID)` 2>/dev/null || true; rm -f $(BACKEND_PID); fi
	@if [ -f $(FRONTEND_PID) ]; then kill `cat $(FRONTEND_PID)` 2>/dev/null || true; rm -f $(FRONTEND_PID); fi

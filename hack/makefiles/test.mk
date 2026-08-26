.PHONY: test.unit test.e2e

## test.unit: 运行 Go 单元测试
test.unit:
	@cd $(BACKEND_DIR) && go test ./...

## test.e2e: 运行 Playwright E2E
test.e2e:
	@cd $(E2E_DIR) && pnpm exec playwright test

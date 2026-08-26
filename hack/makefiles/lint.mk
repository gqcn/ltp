.PHONY: lint

## lint: 运行 Go 静态检查
lint:
	@golangci-lint run ./apps/backend/...

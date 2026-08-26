## 1. 目录搬迁

- [x] 1.1 将后端迁入`apps/backend/`（`api/`、`internal/`、`pkg/`、`manifest/`、`main.go`、`go.mod`、`go.sum`）
- [x] 1.2 将前端迁入`apps/frontend/`
- [x] 1.3 将 Compose 迁入`hack/deploy/`，将 E2E 迁入`hack/tests/`
- [x] 1.4 增加根`go.work`

## 2. 编排与文档

- [x] 2.1 根`Makefile`改为 include `hack/makefiles/`，在`apps/backend`执行`gf`生成与`go run`
- [x] 2.2 更新根 README 与应用/hack 目录说明文档
- [x] 2.3 更新`openspec/config.yaml`中的布局描述

## 3. 验证

- [x] 3.1 在`apps/backend`运行`go test ./...`与根`make lint`
- [x] 3.2 运行现有 E2E 确认登录与数据中心闭环

## Why

当前仓库把`GoFrame`后端放在根目录、前端放在`web/`，与参考仓库`linapro-site`的多应用布局不一致。后续增加模块、脚本和测试时，根目录会继续膨胀。需要按参考仓库的`apps/` + `hack/`结构收拢源码，同时保持现有登录与数据中心闭环可用。

## What Changes

- 后端迁入`apps/backend/`，保留`GoFrame v2`的`api/`、`internal/`、`pkg/`、`manifest/`、`main.go`。
- 前端迁入`apps/frontend/`，继续使用`React` + `Vite` + `Tailwind CSS`，不引入`Vben`。
- 根目录`Makefile`改为编排入口；开发、数据库、静态检查和测试目标拆到`hack/makefiles/`。
- 本地`PostgreSQL`编排迁到`hack/deploy/`。
- `Playwright` E2E 迁到`hack/tests/`，对齐参考仓库的测试落点。
- 增加`go.work`，`Go`模块根为`apps/backend`。
- **BREAKING**（仅开发路径）：原先从仓库根执行的`go run .`、`cd web`需改为`apps/backend`与`apps/frontend`。对外 HTTP 契约与页面行为不变。

## Capabilities

### New Capabilities

- `repo-layout`: 仓库多应用目录、根`Makefile`编排、测试与部署脚本落点。

### Modified Capabilities

- 无。本变更不改变登录、数据中心或控制台壳层的功能需求。

## Impact

- 影响`api/`、`internal/`、`pkg/`、`manifest/`、`web/`、`Makefile`、`docker-compose.yml`、`hack/`、`README.md`与 E2E 配置。
- 不影响运行时 API 路径、会话 Cookie、数据库 schema 或用户可见页面。
- 无`i18n`语言包变更；无数据权限变更。

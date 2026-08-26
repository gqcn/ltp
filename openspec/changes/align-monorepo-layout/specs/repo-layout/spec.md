## ADDED Requirements

### Requirement: 仓库按多应用目录存放源码

仓库 MUST 使用与参考仓库一致的应用拆分：后端位于`apps/backend/`，前端控制台位于`apps/frontend/`，共享脚本位于`hack/`。根目录 MUST NOT 再放置`main.go`、`api/`、`internal/`或前端`src/`。

#### Scenario: 后端模块可独立构建

- **WHEN** 开发者在`apps/backend`执行`go test ./...`
- **THEN** 后端包可以完成编译和单元测试

#### Scenario: 前端应用位于 apps/frontend

- **WHEN** 开发者查看前端源码
- **THEN** `React`入口、页面和样式位于`apps/frontend/src/`，而不是仓库根下的`web/`

### Requirement: 根 Makefile 编排前后端与数据库

根`Makefile` MUST 作为唯一日常入口，通过`hack/makefiles/`提供数据库、开发、静态检查和测试目标。`make dao`与`make ctrl` MUST 在`apps/backend`内调用`gf`生成。

#### Scenario: 本地开发入口不变

- **WHEN** 开发者在仓库根执行`make db.up`、`make db.init`、`make dev`
- **THEN** PostgreSQL、SQL 初始化和前后端进程仍能按现有端口拉起

### Requirement: E2E 与 Compose 落在 hack/

`Playwright` E2E MUST 存放在`hack/tests/`。本地`PostgreSQL` Compose 文件 MUST 存放在`hack/deploy/`。

#### Scenario: 运行 E2E

- **WHEN** 开发者在仓库根执行`make test.e2e`
- **THEN** 测试从`hack/tests`启动，并继续覆盖登录、数据中心闭环与退出

## Context

参考仓库`linapro-site`把源码按应用拆分：

- `apps/lina-core`：`GoFrame`宿主
- `apps/lina-vben`：管理工作台
- `hack/`：Makefile 片段、部署、E2E
- 根`Makefile`只做编排

`LTP`当前是单模块仓库：后端在根目录，前端在`web/`。它不是框架产品，没有官网、插件运行时或`linactl`，因此只对齐目录骨架，不复制那些能力。

## Goals / Non-Goals

**Goals:**

- 让日常开发能从目录名识别后端、前端、脚本和测试。
- 根`Makefile`继续提供`make db.up`、`make db.init`、`make dao`、`make ctrl`、`make dev`、`make lint`、`make test.unit`、`make test.e2e`。
- `Go`模块路径保持`github.com/gqcn/ltp`，避免全量改 import。

**Non-Goals:**

- 不引入`Vben`、官网 Docusaurus、插件目录或`go.work`多后端。
- 不改变 HTTP API、数据库 schema、页面交互。
- 不实现`linactl`。

## Decisions

1. **应用命名用`backend` / `frontend`**
   - 对应参考仓库的`lina-core` / `lina-vben`。
   - 前端继续用现有`React`控制台，而不是搬`Vben`单仓内部结构。

2. **`Go`模块留在`apps/backend`，根目录加`go.work`**
   - 备选：模块留在仓库根并用 replace。拒绝，因为那会让根目录继续混放应用代码。
   - `gfile.Pwd()`依赖进程工作目录读取`manifest/sql`；`make db.init`必须在`apps/backend`下执行。

3. **E2E 放到`hack/tests/`**
   - 对齐参考仓库测试落点。
   - 不把 Playwright 留在前端应用里，避免测试依赖和产品依赖缠在一起。

4. **Compose 文件放到`hack/deploy/docker-compose.yml`**
   - 对齐参考仓库的部署脚本位置。

5. **Makefile 拆分，但不引入`linactl`**
   - 根文件只 include `hack/makefiles/*.mk`。
   - 代码生成仍在`apps/backend`调用`gf gen dao` / `gf gen ctrl`。

## Risks / Trade-offs

- [开发者仍从根目录`go run .`] → 根`Makefile`给出正确入口；根目录不再放`main.go`。
- [gf 生成配置找不到] → `apps/backend/hack/config.yaml`与模块同级`hack/`，在模块目录执行`gf`。
- [Vite 进程仍指向旧`web/`] → 搬迁后用新路径重启`make dev`。

## Migration Plan

1. 移动后端、前端、Compose、E2E。
2. 更新 Makefile、README、OpenSpec 上下文。
3. 在`apps/backend`运行单元测试与`make lint`。
4. 用新路径跑现有 E2E。

回滚：把目录再移回根即可；无数据迁移。

## Open Questions

无。不引入官网或插件应用。

## 1. 额度口径

- [x] 1.1 `CapacityPreview`与超额校验排除已`cordon`或已隔离节点
- [x] 1.2 `queue.Service`增加隔离额度影响预览：一次列节点、按数据中心批量查队列

## 2. 节点隔离预览接口

- [x] 2.1 定义`GET /nodes/quota-impact`，执行`make ctrl`
- [x] 2.2 `node.Service`注入可选`queue.Service`，校验节点存在后返回影响

## 3. 前端

- [x] 3.1 队列额度预览文案标明只统计可调度且未隔离节点
- [x] 3.2 隔离确认框请求影响预览；有变化时醒目展示，超额用危险样式；无变化不展示

## 4. 验证

- [x] 4.1 单元测试：额度预览排除不可调度/已隔离；隔离后将超额时影响预览标记超额
- [x] 4.2 E2E：隔离确认框在额度将下降/将超额时展示对应提示
- [x] 4.3 `make lint`与相关`go test`（`queue`/`node`/`api/node`/`api/queue` lint 通过；全仓`make lint`被无关的`training/experiments` gofmt 阻断）

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- 无 i18n 语言包；提示文案写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，确认框沿用现有`Modal`与`.modal-maint-hint`分层，超额用`.is-danger`。

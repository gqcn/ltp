## 1. 接口与卡时投影

- [x] 1.1 `GET /queues`增加可选`enabled`，列表/详情增加`gpuHoursMonth`
- [x] 1.2 `trainjob`提供按队列 ID 批量返回本月卡时
- [x] 1.3 队列列表在传入`enabled`时按 Volcano 启用态过滤后再分页
- [x] 1.4 队列控制器注入`trainjob.Service`，按当前页批量写入卡时

## 2. 前端

- [x] 2.1 队列管理工具栏增加状态筛选下拉，变更时回到第 1 页
- [x] 2.2 列表增加「本月卡时」列，复用已有卡时格式化

## 3. 验证

- [x] 3.1 单元测试：启用筛选、卡时按月聚合
- [x] 3.2 E2E：状态下拉筛选与卡时列可见
- [x] 3.3 `make lint`与相关`go test`；浏览器走通队列管理

## 4. 禁用确认提示（反馈）

- [x] 4.1 禁用队列确认框提示运行中任务不受影响，排队任务需手动终止
- [x] 4.2 E2E：打开禁用确认框并断言上述文案

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- 无 i18n 语言包；筛选文案写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，筛选与列对齐现有工具栏和「我的队列」卡时展示。
- 4.1 / 4.2：无 API、数据库、架构模块边界变更。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，确认框沿用现有`Modal`与`.modal-hint.is-warning`。

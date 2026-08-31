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

## 5. 删除队列确认框去重（反馈）

- [x] 5.1 删除确认框标题与正文不再复述「确定要删除队列」；后果提示去掉与禁用框重复的「新任务不可再选择」
- [x] 5.2 占用拦截框正文与提示条分工：正文说占用，提示条给运行/排队数量与处理建议
- [x] 5.3 E2E：空闲删除确认与占用拦截的文案断言与截图

## 6. 删除队列提示对齐原型（反馈）

- [x] 6.1 空闲删除问句与后果条对齐`prototype.v4`（「确定要删除队列」+「团队关联将解除。已结束任务的历史记录会保留。此操作不可撤销。」）
- [x] 6.2 占用拦截：数量写入正文，提示条只保留「请等待任务结束，或先停止相关任务后再删除」
- [x] 6.3 更新`TC016`文案断言与截图

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- 无 i18n 语言包；筛选文案写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，筛选与列对齐现有工具栏和「我的队列」卡时展示。
- 4.1 / 4.2：无 API、数据库、架构模块边界变更。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，确认框沿用现有`Modal`与`.modal-hint.is-warning`。
- 5.1 / 5.2 / 5.3：无 API、数据库、架构模块边界变更。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，确认框沿用现有`Modal`、`.modal-msg`/`.modal-meta`/`.modal-hint`分层。`.agents/rules/api-contract.md`、`architecture.md`、`backend-go.md`、`database.md`无影响。
- 6.1 / 6.2 / 6.3：无 API、数据库、架构模块边界变更。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，文案对齐`prototype.v4`队列确认框。`.agents/rules/api-contract.md`、`architecture.md`、`backend-go.md`、`database.md`无影响。

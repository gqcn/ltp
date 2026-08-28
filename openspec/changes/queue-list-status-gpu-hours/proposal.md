## Why

运维在队列管理里只能按关键词、数据中心、卡型号筛选，无法按启用/禁用收窄列表；本月卡时已在「我的队列」核算，但运维列表没有独立列，排障与用量核对都要跳页。

## What Changes

- 队列管理工具栏增加状态筛选下拉：`全部状态` / `启用` / `禁用`，与列表状态徽章一致。
- `GET /queues`增加可选`enabled`查询参数；省略为全部，`true`为启用，`false`为禁用。
- 队列列表增加「本月卡时」列，算法与「我的队列」相同：`GPU`数 × 运行时长，排队不计，按自然月交集聚合。
- 列表项增加`gpuHoursMonth`；卡时按当前页队列 ID 批量装配，禁止按行补查。
- 禁用队列确认框纠正任务影响说明：运行中不受影响，排队中无法被调度、需手动终止。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `queue-management`：列表筛选增加启用状态；每行增加本月卡时。

## Impact

- API：`GET /queues`查询参数与列表/详情 DTO。
- 后端：`queue`列表过滤；`trainjob`批量卡时投影；队列控制器注入`trainjob.Service`。
- 前端：队列管理工具栏与表格列。
- 测试：队列列表状态筛选单元测试、卡时聚合单元测试、队列管理 E2E。
- 无数据库迁移；无 i18n 语言包；`.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`缺失。
- 规则无影响判断：不改 SQL 文件与删除语义，`database.md`无影响。

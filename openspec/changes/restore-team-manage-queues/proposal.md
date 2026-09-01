## Why

`ops-center-runtime`把团队详情的队列做成只读，绑定只能去队列管理。`prototype.v4`在团队详情提供「管理队列」，可从团队侧勾选绑定。两边入口应对称，关联本身也已改为选填。

## What Changes

- 团队详情恢复「管理队列」：打开勾选列表，保存后替换该团队的队列绑定。
- 新增`PUT /teams/{id}/queues`与`GET /teams/queue-options`。
- 空列表表示解除该团队全部队列绑定，不改动队列上其他团队。
- 无队列模块时仍隐藏该入口。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `platform-teams`：团队详情可管理关联队列。

## Impact

- API：团队资源下新增替换队列绑定与队列候选项。
- 后端：`queue.Service`按团队替换`ops_queue_team`行；`team.Service`校验团队后委托。
- 前端：详情「管理队列」弹窗与关联队列展示。
- 测试：绑定/解绑单元测试与`E2E`。
- 无数据库迁移。`.agents/rules/i18n.md`缺失。

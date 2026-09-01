## Why

队列管理新建/编辑把关联团队做成必填，团队管理却允许团队不绑定任何队列。同一条多对多关系在两边校验不一致，运维无法先建队列、后补绑定。

## What Changes

- 队列创建、更新的`teamIds`改为选填：省略或空数组表示暂不绑定团队；编辑时提交空列表会解除全部绑定。
- 队列表单去掉关联团队的必填星标与「请至少关联一个团队」校验；列表无团队时继续显示「—」。
- 仍校验所选团队存在，且单次最多 100 个。
- 训练中心「我的队列」与新建任务候选仍只展示至少绑定一个团队的队列；未绑定团队的队列不能提交任务。管理员也不例外。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `queue-management`：创建/更新队列时关联团队改为选填。
- `training-my-queues`：未绑定团队的队列不得出现在「我的队列」与新建任务候选中。

## Impact

- API：`POST /queues`、`PUT /queues/{id}`的`teamIds`去掉`required`/`min-length:1`。
- 后端：`normalizeTeamIDs`允许空列表；`ListInCluster`在`allTeams`时仍只返回已绑定团队的队列。
- 前端：队列表单 Zod 与必填星标；空态展示沿用现有「—」。
- 测试：空团队创建/解绑单元测试；表单校验 E2E 去掉必填断言，并覆盖不选团队即可创建。
- 无数据库迁移；关联表已支持零行。`database.md`无影响。无 i18n 语言包。

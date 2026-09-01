## 1. 接口与服务

- [x] 1.1 定义`PUT /teams/{id}/queues`与`GET /teams/queue-options`，执行`make ctrl`
- [x] 1.2 `queue.Service`实现按团队替换绑定与候选项分页
- [x] 1.3 `team.Service`校验团队后委托`QueueSource`；无队列模块时选项为空、写入拒绝

## 2. 前端

- [x] 2.1 团队详情恢复「管理队列」弹窗，保存后刷新关联列表
- [x] 2.2 空态不再要求只能去队列管理维护

## 3. 验证

- [x] 3.1 单元测试：绑定、解绑、非法队列 ID
- [x] 3.2 `E2E`：管理队列绑定后详情可见，解绑后空态
- [x] 3.3 `make lint`与相关`go test`

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- `.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`缺失。

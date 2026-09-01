## 1. 接口与服务

- [x] 1.1 `POST /queues`与`PUT /queues/{id}`的`teamIds`改为选填，上限 100
- [x] 1.2 `normalizeTeamIDs`允许空列表；非空仍校验存在且最多 100
- [x] 1.3 `ListInCluster(allTeams)`只返回至少绑定一个团队的队列

## 2. 前端

- [x] 2.1 队列表单去掉关联团队必填星标与 Zod `min(1)`
- [x] 2.2 帮助文案说明可先不关联；无团队列表仍显示「—」

## 3. 验证

- [x] 3.1 单元测试：空团队可创建、更新可解绑、非法 ID 拒绝、训练侧列表不含未绑定队列
- [x] 3.2 更新 TC004：空表单不再要求「请至少关联一个团队」
- [x] 3.3 E2E：不选团队可创建队列，列表关联团队为空占位
- [x] 3.4 `make lint`与相关`go test`

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- 无 i18n 语言包；`.agents/rules/i18n.md`与`.agents/rules/frontend-ui.md`缺失。

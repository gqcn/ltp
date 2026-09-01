## 1. 接口与列表过滤

- [x] 1.1 `GET /users`增加可选`teamId`（省略或`0`为全部，大于`0`为该团队成员）
- [x] 1.2 `user.List`在数据库侧按`sys_team_member.team_id`过滤后再分页
- [x] 1.3 控制器把`teamId`传入`ListInput`；必要时执行`make ctrl`

## 2. 前端

- [x] 2.1 `listUsers`支持`teamId`查询参数
- [x] 2.2 用户管理工具栏增加团队筛选下拉，选项来自`GET /teams`，变更时回到第`1`页

## 3. 验证

- [x] 3.1 单元测试：按团队筛选命中成员、排除非成员、省略`teamId`不收窄
- [x] 3.2 E2E：用户管理选择团队后列表只含该团队成员，切回「全部团队」后不再按团队收窄
- [x] 3.3 `make lint`与相关`go test`

## 规则影响记录

- 命中`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`、`openspec.md`、`documentation.md`。
- 无 SQL 变更，`database.md`无影响。
- 无 i18n 语言包；筛选文案写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，下拉对齐现有用户管理工具栏与任务列表团队筛选。

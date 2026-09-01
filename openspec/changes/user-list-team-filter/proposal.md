## Why

用户管理已能按关键词、角色和启用状态筛选，列表也展示所属团队，但不能按团队收窄。管理员要核对某团队成员或找出未按团队组织的用户时，只能靠搜索或翻页，和任务列表、配置列表已有的团队筛选不一致。

## What Changes

- 用户管理工具栏增加团队筛选下拉：`全部团队`以及现有团队名称，变更时回到第`1`页。
- `GET /users`增加可选`teamId`查询参数；省略或`0`表示全部，大于`0`只返回该团队成员（一人多团队时，命中任一即可）。
- 团队选项复用已有`GET /teams`，不新增下拉接口。
- 筛选、排序与分页仍在数据库侧完成后再装配当前页团队投影。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `platform-users`：平台用户列表增加按所属团队筛选。

## Impact

- API：`GET /users`查询参数增加`teamId`。
- 后端：`user`列表在分页前按`sys_team_member`过滤；不新增模块依赖。
- 前端：用户管理工具栏增加团队下拉，调用`listTeams`填充选项。
- 测试：用户列表团队筛选单元测试、用户管理 E2E。
- 无数据库迁移；无 i18n 语言包；`.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`缺失。
- 规则无影响判断：不改 SQL 文件与删除语义，`database.md`无影响。

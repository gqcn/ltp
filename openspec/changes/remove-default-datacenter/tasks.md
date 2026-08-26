## 1. 数据

- [x] 1.1 新增`003-remove-default-datacenter.sql`：幂等软删除标识`default`且`is_default`为真的数据中心
- [x] 1.2 执行`make db.init`

## 2. 后端

- [x] 2.1 去掉默认中心保护、保留标识与 KPI`defaultShortName`；列表不再按默认中心置顶
- [x] 2.2 更新数据中心服务单元测试与标识校验测试
- [x] 2.3 运行相关`Go`测试与`make lint`

## 3. 前端与文档

- [x] 3.1 数据中心页去掉默认 KPI、默认角标与保护按钮，文案改为未配置即为空
- [x] 3.2 更新根`README.md`当前范围
- [x] 3.3 更新数据中心 E2E：断言不再出现内置默认中心，覆盖增删改查启停

## 规则影响记录

- 无 i18n 语言包；页面中文文案直接修改（`.agents/rules/i18n.md`缺失）。
- 前端视觉以现有`prototype.css`为准（`.agents/rules/frontend-ui.md`缺失）。
- 无行级数据权限（`.agents/rules/data-permission.md`缺失，判定无影响）。
- 不修改`DAO/DO/Entity`，保留`is_default`列。

## Why

内置「默认数据中心」会让未打数据中心标签的节点被当成已归属，和「未配置即为空」不符。数据中心应只登记真实机房，节点没有`maip.io/datacenter`时保持未分配。

## What Changes

- 取消系统种子中的内置默认数据中心（标识`default`），已有库幂等软删除该行。
- 取消默认中心保护：任意数据中心都可启停、删除；标识`default`不再保留。
- **BREAKING**：列表 KPI 不再返回`defaultShortName`；页面去掉「默认数据中心」统计、默认角标和禁用的停用/删除按钮。
- 删除有关联资源时不再改挂到默认中心；节点未配置数据中心时保持未分配。
- 本迭代仍无节点模块实现，只固定契约与文案，避免后续节点接入时回落到默认中心。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `datacenter-management`：删除「系统始终存在一个默认数据中心」及启停/删除保护；未配置节点保持未分配。

## Impact

- SQL：新增`003-remove-default-datacenter.sql`（不改`001`）。
- 后端：数据中心服务、列表 KPI、错误码、标识校验与单元测试。
- 前端：数据中心页 KPI、列表操作列、创建/删除文案。
- E2E：去掉默认中心保护断言，改为断言列表中不再出现内置默认中心。
- 文档：根`README.md`当前范围描述。
- `is_default`列保留（现有行均为否），不再生效、不重新生成 DAO。
- 无 i18n 语言包；无行级数据权限；`.agents/rules/frontend-ui.md`缺失。

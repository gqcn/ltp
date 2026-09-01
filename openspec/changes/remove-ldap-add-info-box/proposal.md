## Why

「从`LDAP`添加用户」弹窗顶部展示协议、主机端口、`Base DN`和最近测试状态。这些连接细节属于系统配置，放在添加流程里干扰勾选用户，也和系统配置页重复。

## What Changes

- 去掉弹窗顶部的`LDAP`连接信息展示框。
- 弹窗仍保留说明、角色选择、目录检索与勾选添加。
- 打开弹窗不再请求`LDAP`配置接口，仅检索目录。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `platform-users`：从`LDAP`添加用户的弹窗不再展示连接信息。

## Impact

- 前端：`UserPage`去掉`ldap-add-cfg`及其配置查询；删除仅用于该框的样式。
- 测试：打开添加弹窗的`E2E`断言不再出现主机、端口、`Base DN`或测试状态。
- 无 API 契约变更；系统配置页的`LDAP`配置与测试连接不变。
- 无数据库迁移。`architecture.md`、`api-contract.md`、`backend-go.md`、`database.md`无影响。

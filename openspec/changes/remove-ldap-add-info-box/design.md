## Context

用户管理「从`LDAP`添加用户」弹窗在说明文案下方有一块`ldap-add-cfg`：协议（`LDAP`/`LDAPS`）、`host:port`、`Base DN`、最近测试成功或建议先测试连接。数据来自打开弹窗时请求的`getLdapConfig`。连接信息已在系统配置维护，添加流程只需要检索目录并勾选用户。

## Goals / Non-Goals

**Goals:**

- 弹窗不再展示`LDAP`连接信息。
- 添加流程其余交互不变。
- 去掉仅为该框发起的配置查询。

**Non-Goals:**

- 不改系统配置页的`LDAP`表单与测试连接。
- 不改目录检索、角色选择、批量添加接口。
- 不在弹窗里加跳转系统配置的入口。

## Decisions

1. **只删展示框，保留说明文案**
   - 顶部`modal-lead`仍说明按当前配置检索目录。
   - 备选是连说明一起删。拒绝：用户要求去掉的是信息展示框，不是操作说明。

2. **打开弹窗不再拉配置**
   - 去掉`ldapCfgQuery`与`getLdapConfig`导入。
   - 目录检索仍在打开时请求。
   - 备选是继续拉配置但不展示。拒绝：没有消费者的请求是多余流量。

3. **删除仅用于该框的样式**
   - `.ldap-add-cfg`与`.ldap-add-cfg-inner`只服务该框，一并删除。

## 复杂度与性能

- 不新增抽象。打开弹窗少一次配置请求。

## 规则影响

- 命中`testing.md`、`openspec.md`、`documentation.md`。
- 不改模块边界、HTTP 契约、后端或 SQL；`architecture.md`、`api-contract.md`、`backend-go.md`、`database.md`无影响。
- 无 i18n 语言包。`.agents/rules/frontend-ui.md`缺失，弹窗沿用现有`Modal`。

## Risks / Trade-offs

- [运维在添加时看不到当前连的是哪套目录] → 连接信息仍在系统配置；弹窗说明仍写「按当前 LDAP 配置检索」。

## Migration Plan

只发前端。回滚即恢复展示框与配置查询。

## Open Questions

无。

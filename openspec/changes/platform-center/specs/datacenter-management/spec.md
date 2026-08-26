## ADDED Requirements

### Requirement: 数据中心接口仅对拥有运维菜单的会话开放

数据中心只读与写操作 MUST 校验`ops`菜单权限。本地管理员与`sre`角色 MUST 可以访问；仅有`training`菜单的用户 MUST 被拒绝。未登录请求仍按认证规则拒绝。

#### Scenario: SRE 可以列出数据中心

- **WHEN** `sre`用户的会话请求数据中心列表
- **THEN** 系统返回列表数据

#### Scenario: 算法工程师不能列出数据中心

- **WHEN** `algo`用户的会话请求数据中心列表
- **THEN** 系统拒绝该请求，不返回业务数据

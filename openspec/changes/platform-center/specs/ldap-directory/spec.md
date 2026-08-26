## ADDED Requirements

### Requirement: 管理员可以保存 LDAP 连接配置

系统 MUST 持久化一份平台级`LDAP`配置，包括名称、主机、端口、是否`TLS`/`LDAPS`、`Base DN`、`Bind DN`、绑定密码、超时、用户认证 Filter、目录搜索 Filter，以及账号/姓名/邮箱/部门/职位属性名。绑定密码 MUST NOT 出现在读取接口的 JSON 中；读取时 MUST 返回是否已设置密码。保存时若密码为空，MUST 保留原密码。

#### Scenario: 保存有效配置

- **WHEN** 管理员提交主机、端口、`Base DN`与`Bind DN`
- **THEN** 系统保存配置并返回不含明文密码的当前配置

#### Scenario: 缺少必填项被拒绝

- **WHEN** 管理员提交时缺少主机、端口、`Base DN`或`Bind DN`
- **THEN** 系统拒绝保存且不覆盖已有配置

### Requirement: 管理员可以测试 LDAP 连接

系统 MUST 使用当前表单参数尝试绑定并检索`Base DN`。表单密码为空时 MUST 使用已保存密码。测试结果 MUST 记录成功或失败及说明。

#### Scenario: 模拟目录可连通

- **WHEN** 配置指向本地 Docker`LDAP`且参数正确
- **THEN** 测试返回成功，并给出可理解的成功说明

#### Scenario: 错误主机失败

- **WHEN** 主机不可达或绑定失败
- **THEN** 测试返回失败说明，不得将绑定密码写入日志

### Requirement: 管理员可以检索 LDAP 目录

系统 MUST 按搜索 Filter 与关键词检索目录用户，并投影账号、姓名、邮箱、部门、职位。单次返回 MUST 有数量上限。已在平台可用列表中的账号 MUST 标记为已添加。关键词为空时 MUST 仍返回不超过上限的目录用户。

#### Scenario: 按关键词检索

- **WHEN** 管理员以`algo`检索目录
- **THEN** 结果包含账号`algo`的目录项，并标明其是否已在平台用户列表中

### Requirement: LDAP 登录对目录执行用户绑定

`LDAP`登录在确认平台用户存在且启用后，MUST 用当前配置的用户认证 Filter 解析该账号并使用用户密码执行绑定。绑定失败 MUST 视为凭据错误，不得创建会话。

#### Scenario: 正确域账号绑定成功

- **WHEN** 已加入平台的启用用户`algo`使用正确`LDAP`密码登录
- **THEN** 系统绑定成功并创建会话

#### Scenario: 错误 LDAP 密码被拒绝

- **WHEN** 已加入平台的用户提交错误`LDAP`密码
- **THEN** 系统不创建会话

## MODIFIED Requirements

### Requirement: 本地管理员可以使用账号密码登录

系统 MUST 提供平台管理员登录入口。内置管理员用户名为`admin`，初始密码为`admin123`。登录请求 MUST 携带`mode=admin`。登录成功后 MUST 建立服务端会话，并通过`HttpOnly` Cookie 返回给浏览器。密码 MUST 以单向哈希存储，禁止明文落库。管理员会话 MUST 标识为本地来源，并拥有全部菜单分区。

#### Scenario: 使用正确凭据登录

- **WHEN** 用户在登录页以管理员入口提交用户名`admin`与密码`admin123`
- **THEN** 系统创建会话，设置会话 Cookie，并返回当前用户的显示名、账号、管理员标记与全部菜单分区

#### Scenario: 错误密码被拒绝

- **WHEN** 用户在管理员入口提交错误密码
- **THEN** 系统不得创建会话，并返回业务错误，不得泄露内部堆栈

### Requirement: 已登录用户可以读取当前会话

受保护接口 MUST 校验会话 Cookie。有效会话 MUST 能读取当前用户账号、显示名、来源、角色编码与名称、菜单分区、是否管理员。缺失、过期或已撤销的会话 MUST 被拒绝。

#### Scenario: 读取有效会话

- **WHEN** 浏览器携带有效会话 Cookie 请求当前会话
- **THEN** 系统返回当前用户账号、显示名、角色与菜单分区

#### Scenario: 未登录访问受保护资源

- **WHEN** 请求未携带有效会话访问数据中心接口
- **THEN** 系统拒绝该请求，不返回业务数据

### Requirement: 用户可以退出登录

退出登录 MUST 撤销服务端会话并使浏览器会话 Cookie 失效。重复退出 MUST 保持幂等成功。

#### Scenario: 退出后会话失效

- **WHEN** 已登录用户执行退出
- **THEN** 同一 Cookie 再次请求当前会话或受保护接口被拒绝

## ADDED Requirements

### Requirement: LDAP 用户可以使用域账号登录

系统 MUST 提供`LDAP`登录入口，请求携带`mode=ldap`。账号 MUST 已存在于平台可用用户列表、来源为`ldap`且状态启用，然后对`LDAP`执行绑定。不在平台列表中的目录账号 MUST 返回明确提示，要求联系管理员添加。停用账号 MUST 拒绝登录。成功后 MUST 创建与管理员相同形态的服务端会话，并更新最近登录时间。

#### Scenario: 平台用户 LDAP 登录成功

- **WHEN** 已加入平台的启用用户`algo`在`LDAP`入口提交正确密码
- **THEN** 系统创建会话，返回其角色与菜单分区，且`isAdmin`为假

#### Scenario: 未加入平台的目录账号被拒绝

- **WHEN** 目录中存在但尚未加入平台的账号尝试`LDAP`登录
- **THEN** 系统不创建会话，并提示该账号不在平台可用用户列表中

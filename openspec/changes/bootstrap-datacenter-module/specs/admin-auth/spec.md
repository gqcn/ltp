## ADDED Requirements

### Requirement: 本地管理员可以使用账号密码登录

系统 MUST 提供平台管理员登录入口。内置管理员用户名为`admin`，初始密码为`admin123`。登录成功后 MUST 建立服务端会话，并通过`HttpOnly` Cookie 返回给浏览器。密码 MUST 以单向哈希存储，禁止明文落库。

#### Scenario: 使用正确凭据登录

- **WHEN** 用户在登录页提交用户名`admin`与密码`admin123`
- **THEN** 系统创建会话，设置会话 Cookie，并返回当前用户的显示名与账号

#### Scenario: 错误密码被拒绝

- **WHEN** 用户提交错误密码
- **THEN** 系统不得创建会话，并返回业务错误，不得泄露用户是否存在的细节之外的内部堆栈

### Requirement: 已登录用户可以读取当前会话

受保护接口 MUST 校验会话 Cookie。有效会话 MUST 能读取当前用户基本信息；缺失、过期或已撤销的会话 MUST 被拒绝。

#### Scenario: 读取有效会话

- **WHEN** 浏览器携带有效会话 Cookie 请求当前会话
- **THEN** 系统返回当前用户账号与显示名

#### Scenario: 未登录访问受保护资源

- **WHEN** 请求未携带有效会话访问数据中心接口
- **THEN** 系统拒绝该请求，不返回业务数据

### Requirement: 用户可以退出登录

退出登录 MUST 撤销服务端会话并使浏览器会话 Cookie 失效。重复退出 MUST 保持幂等成功。

#### Scenario: 退出后会话失效

- **WHEN** 已登录用户执行退出
- **THEN** 同一 Cookie 再次请求当前会话或受保护接口被拒绝

## Context

当前仓库已有本地管理员会话、数据中心闭环和按「已启用模块」隐藏侧栏的壳层。登录页保留了`LDAP`页签，但提交会被前端拦截。`sys_user`只有本地账号字段，没有角色、来源或目录属性。原型`prototype.v4`的平台中心包含用户、团队、角色和系统配置（`LDAP`），并规定：

- 平台用户必须先从公司`LDAP`加入，才能登录。
- 本地`admin`不经`LDAP`，也不出现在用户列表。
- 算法工程师仅训练中心，`SRE`为训练中心 + 运维中心，平台中心仅管理员。
- 团队是虚拟资源边界，不是公司组织架构；成员多对多。

约束与上一迭代相同：`GoFrame v2`分层、`PostgreSQL`幂等 SQL、前端视觉以原型 CSS 为准、构造函数显式注入、禁止`N+1`。`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`、`.agents/rules/data-permission.md`仍缺失。

## Goals / Non-Goals

**Goals:**

- 管理员可配置并测试`LDAP`，从目录添加平台用户，维护角色名、启停/移除用户，以及创建团队并维护成员。
- `LDAP`用户可用域账号登录；会话按角色裁剪菜单；无可用已启用模块时进入空态页。
- 本地 Docker 提供可绑定、可检索的模拟`LDAP`，演示账号`algo`/`sre`可走通。
- 队列模块未上线时，团队详情不展示关联队列入口。

**Non-Goals:**

- 不实现训练中心、队列、集群、节点、告警。
- 不引入字典模块、行级数据权限、多租户或插件宿主。
- 不支持自建平台账号（除内置`admin`）、自定义角色或修改角色菜单范围。
- 不实现团队删除/归档、队列授权。
- 不对`LDAP`绑定密码做独立 KMS；仅避免在 API 响应和日志中回传明文。

## Decisions

### 1. 登录方式作为请求字段，会话形态不变

`POST /auth/sessions`增加`mode`：`admin`或`ldap`。两种方式都写入现有`HttpOnly`会话 Cookie。不引入`JWT`。

- `admin`：`sys_user.source = local`，`bcrypt`校验。
- `ldap`：用户必须已在平台列表、来源为`ldap`且启用，再按当前`LDAP`配置做用户`bind`。不在列表中时返回明确业务错误，而不是泛化的「账号或密码错误」。

备选是同一入口自动探测来源。拒绝：原型明确分两个页签，混用会让`admin`误走`LDAP`。

### 2. 身份来源与角色用命名类型，不引入字典

`sys_user`扩展`email`、`department`、`title`、`role_code`、`source`、`last_login_at`。`source`存`local`/`ldap`，`role_code`存`algo`/`sre`，状态沿用现有`SMALLINT`。Go 侧用命名类型与常量，禁止字面量散落。

不引入字典模块：取值集合固定且与菜单权限硬绑定，字典表不会降低当前复杂度。

### 3. 内置两角色，菜单范围不可改

`sys_role`种子：

| code | 默认名称 | menus |
| --- | --- | --- |
| `algo` | 算法工程师 | `training` |
| `sre` | SRE工程师 | `training`,`ops` |

本地管理员`source=local`不分配`role_code`，视为拥有全部菜单分区（含`platform`）。角色只允许改`name`。用户数字段由列表批量`COUNT`装配，禁止按角色循环查用户。

### 4. 权限中间件按菜单分区解释`permission`标签

现有数据中心 API 已声明`permission:"ops:datacenter:query"`但未执行。本迭代增加`Permission`中间件，读取`g.Meta`的`permission`：

- 无标签：只要已登录。
- 前缀`platform:`：仅管理员。
- 前缀`ops:`：管理员或拥有`ops`菜单。
- 前缀`training:`：管理员或拥有`training`菜单。

`bizctx.Context`在鉴权时写入`UserID`、`Username`、`Nickname`、`IsAdmin`、`Menus`、`Source`、`RoleCode`，避免每个控制器再查库。不引入独立权限表。

### 5. `LDAP`配置单行落库，客户端可替换

`sys_ldap_config`只保留一行业务键`default`。绑定密码存库，`GET`只返回`bindPasswordSet`，不返回明文；空密码表示不修改。测试连接可使用表单中尚未保存的参数，密码留空则用已存密码。

`internal/service/ldap`对外提供配置读写、测试、目录检索、用户查找和登录`bind`。底层`Directory`接口隔离`go-ldap`，单元测试注入替身，不依赖 Docker。生产装配真实客户端。

本地模拟目录用 Compose 服务（`bitnami/openldap`），端口`1389`，`Base DN`为`dc=msxf,dc=com`，种子用户覆盖原型目录（含`algo`/`sre`）。默认配置指向该实例。部门属性映射到`ou`（`inetOrgPerson`无`department`）。

### 6. 用户只能从目录加入；移除为软删除

`POST /users`接收`usernames`+`roleCode`，服务端按用户名批量查`LDAP`后插入，已存在的跳过。禁止手填姓名/邮箱创建。

启停、授权、移除均支持批量，ID 上限 100。移除当前登录用户必须拒绝。移除后删除团队成员关系；同名用户再次从`LDAP`添加时，若存在软删行则恢复并刷新目录属性，避免唯一约束冲突。

用户列表只包含`source=ldap`。团队名通过成员表批量投影，禁止对当前页循环查团队。

### 7. 团队是独立资源，队列关联降级隐藏

`sys_team` + `sys_team_member`。负责人必须是启用中的平台用户，创建/变更负责人时自动加入成员。成员增删走子资源接口。团队使用软删除字段以备后续归档，本迭代不提供删除 API。

队列模块未装配：详情页隐藏「关联队列 / 管理队列」。列表若需占位计数则恒为 0，且不查询不存在的队列表。

### 8. 壳层按菜单 ∩ 已启用模块渲染

已启用模块本迭代为`ops`（数据中心）与`platform`（用户/团队/角色/系统配置）。`training`仍未启用，即使角色包含`training`也不渲染训练菜单。

落地页：优先`ops`，否则`platform`，否则`/home`空态。算法工程师因此进入空态，这是模块隐藏与角色裁剪的交集，不是缺陷。

### 9. 复杂度判断

- `LDAP`客户端接口：隔离外部协议与测试替身，是已确认变化点。
- 权限按前缀解释菜单：两角色 + 管理员，不需要策略引擎。
- 不把用户/角色/团队塞进单一`iam`大服务；各资源独立 service，跨模块只通过构造函数注入接口（`user`添加用户时调用`ldap.Service`检索）。
- 不预埋队列授权表。

## Risks / Trade-offs

- [算法工程师登录后几乎无页面] → 空态页说明训练中心尚未启用；演示账号`sre`可验证运维菜单。
- [本机 389 端口可能被系统目录服务占用] → 模拟`LDAP`映射`1389`。
- [绑定密码明文存库] → 仅本地开发可接受；API/日志不回传；后续可加配置密钥封装。
- [OpenLDAP 无`department`属性] → 默认映射`ou`，配置页可改属性名。
- [规则文件缺失] → 视觉对齐原型，文案中文，无行级数据权限；任务记录写明。
- [现有 E2E 断言「用户管理」隐藏] → 同步更新管理员用例，并补`LDAP`角色用例。

## Migration Plan

1. 启动模拟`LDAP`：`make ldap.up`。
2. `make db.init`执行`002-platform-center.sql`（扩展用户表、角色/团队/`LDAP`配置种子、`algo`/`sre`平台用户）。
3. `make dao` / `make ctrl`。
4. 可选`make db.mock`加载其余原型用户与团队。
5. `make dev`。

回滚：丢弃开发库中本迭代表字段与新表；会话 Cookie 形态不变。无线上数据。

## Open Questions

无阻塞问题。队列授权留待队列模块变更。

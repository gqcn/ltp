# LTP

`LTP`是大模型训练管理平台。当前交付登录（本地管理员与`LDAP`）以及运维中心的数据中心、平台中心的用户 / 团队 / 角色 / 系统配置。

## 技术选型

| 层级 | 选型 |
| --- | --- |
| 后端 | `GoFrame v2` HTTP 服务 |
| 数据库 | `PostgreSQL` |
| 身份目录 | 本地 Docker 模拟`LDAP`（`osixia/openldap`） |
| 前端 | `React` + `TypeScript` + `Vite` + `Tailwind CSS` |
| 测试 | `Go`单元测试与`Playwright` E2E |

## 本地启动

本地开发使用本机`PostgreSQL`，地址`127.0.0.1:5432`，数据库名`ltp`。模拟`LDAP`监听`127.0.0.1:1389`。

1. 复制`apps/backend/manifest/config/config.template.yaml`为`config.yaml`，填入本地数据库账号，不要把真实口令提交到仓库
2. 确认本机`PostgreSQL`已启动，然后执行：`make db.up`
3. 初始化表结构与种子数据：`make db.init`
4. 启动模拟`LDAP`：`make ldap.up`
5. 可选加载原型用户与团队：`make db.mock`
6. 启动前后端：`make dev`（会同时确保数据库初始化并拉起`LDAP`）
7. 查看运行状态：`make status`

打开`http://127.0.0.1:5173`。停止前后端：`make stop`。本机`PostgreSQL`不随`make stop`退出；模拟`LDAP`用`make ldap.down`。

| 入口 | 账号 | 密码 | 可见范围 |
| --- | --- | --- | --- |
| 平台管理员 | `admin` | `admin123` | 数据中心 + 平台中心 |
| LDAP | `sre` | `sre123` | 数据中心 |
| LDAP | `algo` | `algo123` | 训练中心尚未启用，进入空态页 |

模拟目录`Bind DN`为`cn=admin,dc=msxf,dc=com`，密码`admin`。尚未加入平台的目录用户（如`sunlei` / `ldap123`）可在用户管理中「从 LDAP 添加」。

## 代码生成

SQL 或 API 契约变更后：

- `make dao`在`apps/backend`生成`DAO/DO/Entity`
- `make ctrl`根据`apps/backend/api/`生成控制器骨架

不要手工修改生成的`DAO/DO/Entity`文件。

## 目录

```text
apps/backend/      GoFrame 宿主（api、internal、pkg、manifest）
apps/frontend/     React 控制台
hack/makefiles/    根 Make 目标
hack/deploy/       可选 Compose（模拟 LDAP；本地 PostgreSQL 不依赖它）
hack/tests/        Playwright E2E
openspec/          变更提案与规格
```

## 当前范围

本迭代已启用：

- 本地管理员认证与`LDAP`登录
- 控制台壳层按角色菜单与已启用模块求交
- 数据中心增删改查与启停；节点未配置数据中心时保持未分配
- 平台中心：用户、团队、角色、系统配置（`LDAP`）

后续变更才会开放：训练任务、队列、集群、节点与告警。

# LTP

`LTP`是大模型训练管理平台。当前仓库交付的是第一段闭环：本地管理员登录与数据中心管理。

## 技术选型

| 层级 | 选型 |
| --- | --- |
| 后端 | `GoFrame v2` HTTP 服务 |
| 数据库 | `PostgreSQL` |
| 前端 | `React` + `TypeScript` + `Vite` + `Tailwind CSS` |
| 测试 | `Go`单元测试与`Playwright` E2E |

## 本地启动

本地开发使用本机`PostgreSQL`，地址`127.0.0.1:5432`，数据库名`ltp`。

1. 确认本机`PostgreSQL`已启动，然后执行：`make db.up`
2. 初始化表结构与种子数据：`make db.init`
3. 可选加载原型数据中心：`make db.mock`
4. 启动前后端：`make dev`

打开`http://127.0.0.1:5173`，使用`admin` / `admin123`登录。

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
hack/deploy/       可选 Compose 文件（本地 PostgreSQL 不依赖它）
hack/tests/        Playwright E2E
openspec/          变更提案与规格
```

## 当前范围

本迭代已启用：

- 本地管理员认证
- 控制台壳层与深色/浅色主题
- 数据中心增删改查、启停、默认数据中心保护

后续变更才会开放：训练任务、队列、集群、节点、`LDAP`、用户、团队与角色。

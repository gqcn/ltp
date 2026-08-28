# LTP

`LTP`是大模型训练管理平台。当前交付登录（本地管理员与`LDAP`）、训练中心的任务 / 我的队列 / 配置管理、运维中心的数据中心 / 集群 / 节点 / 队列 / 告警，以及平台中心的用户 / 团队 / 角色 / 系统配置。

## 技术选型

| 层级 | 选型 |
| --- | --- |
| 后端 | `GoFrame v2` HTTP 服务 |
| 数据库 | `PostgreSQL` |
| 身份目录 | 本地 Docker 模拟`LDAP`（`osixia/openldap`） |
| 前端 | `React` + `TypeScript` + `Vite` + `Tailwind CSS` |
| 调度 | `Kubernetes 1.27` + `Volcano 1.13`（本地用`kind` + `Helm`，工作节点模拟`GPU`） |
| 测试 | `Go`单元测试与`Playwright` E2E |

## 本地启动

本地开发使用本机`PostgreSQL`，地址`127.0.0.1:5432`，数据库名`ltp`。模拟`LDAP`监听`127.0.0.1:1389`。

1. 复制`apps/backend/manifest/config/config.template.yaml`为`config.yaml`，填入本地数据库账号，不要把真实口令提交到仓库
2. 确认本机`PostgreSQL`已启动，然后执行：`make db.up`
3. 初始化表结构与种子数据：`make db.init`
4. 启动模拟`LDAP`：`make ldap.up`
5. 可选加载原型用户与团队：`make db.mock`
6. 可选拉起本地`kind`集群（含模拟`GPU`工作节点）并安装`Volcano`：`make kind.up`（需已安装`kind`、`kubectl`、`Helm`、`Docker`）
7. 启动前后端：`make dev`（会同时确保数据库初始化并拉起`LDAP`，完成后以`make status`展示状态）
8. 之后随时查看运行状态：`make status`

打开`http://127.0.0.1:5173`。停止前后端：`make stop`。本机`PostgreSQL`不随`make stop`退出；模拟`LDAP`用`make ldap.down`；`kind`集群用`make kind.down`。

接入本地`kind`集群：执行`kind get kubeconfig --name ltp`，在「集群管理」粘贴完整`Kubeconfig`。`make kind.up`会创建`gpu-node-h200` / `gpu-node-h800` / `gpu-node-4090`三个模拟`GPU`节点（各 8 卡），节点管理应能看到`GPU`用量与型号，而不是只有`CPU`。创建队列后可用`kubectl --context kind-ltp get queue`核对`Volcano Queue`对象。提交训练任务后可用`kubectl --context kind-ltp -n maip get jobs.batch.volcano.sh`核对`Volcano Job`。`make kind.down`会删除集群中的`Queue`对象，库中的业务队列仍在，列表会提示找不到对应的`Volcano Queue`；在队列行点「重新同步」即可按库中额度写回。若本地已有旧的单节点`ltp`集群，需先`make kind.down`再`make kind.up`。实验室说明见`hack/deploy/kind/README.md`。

FastX 告警对接地址为`http://127.0.0.1:8000/api/webhooks/fastx/alerts`，字段映射与示例见`docs/ops/fastx-alert-webhook.md`。

| 入口 | 账号 | 密码 | 可见范围 |
| --- | --- | --- | --- |
| 平台管理员 | `admin` | `admin123` | 训练中心 + 运维中心 + 平台中心 |
| LDAP | `sre` | `sre123` | 训练中心 + 运维中心 |
| LDAP | `algo` | `algo123` | 训练中心 |

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
- 集群管理：`Kubeconfig`接入、连通测试、用量展示
- 节点管理：数据中心 / 标签 / 污点、隔离与入池、维护记录
- 队列管理：业务队列同步`Volcano Queue`
- 告警中心：`FastX` Webhook 入库与处理
- 平台中心：用户、团队、角色、系统配置（`LDAP`）
- 训练中心：任务列表 / 新建 / 详情（`Volcano Job`）、我的队列、配置集草稿与版本；任务详情中的日志检索（`ES`）与任务监控（`Grafana`）本迭代为占位

后续变更才会开放：集群概览与实验分析。

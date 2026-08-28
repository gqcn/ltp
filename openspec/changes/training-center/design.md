## Context

当前仓库已有登录、数据中心、集群/节点/队列/告警，以及平台用户/团队/角色。训练中心仍禁用：`algo`进入空态页，管理员侧栏没有任务列表。`kube.ClusterClient`已能创建/读取/删除`Volcano Job`，但没有 HTTP 提交入口，也没有业务任务表。需求来源是`prototype.v4`：任务列表、新建任务、任务详情、我的队列、配置管理。用户明确：任务基于`Volcano Job`；详情中的日志检索（`ES`）与任务监控（`Prometheus`/`Grafana`）本迭代只留页签占位。

约束与上一迭代相同：`GoFrame v2`分层、`PostgreSQL`幂等 SQL、前端视觉以原型 CSS 为准、构造函数显式注入、禁止`N+1`。`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`、`.agents/rules/data-permission.md`仍缺失。

## Goals / Non-Goals

**Goals:**

- 拥有`training`菜单的会话可提交、查看、停止、重跑训练任务；任务在目标集群创建为`batch.volcano.sh/v1alpha1 Job`。
- 用户可见所属团队的队列额度、占用、本月卡时与活跃任务。
- 配置集支持草稿与不可变版本，提交任务时可挂载到容器路径。
- 任务详情提供配置信息、Pod/容器日志、关联告警；日志检索与任务监控页签展示后续对接说明。
- `algo`登录进入任务列表；实验分析菜单完全隐藏。

**Non-Goals:**

- 不实现实验分析、TensorBoard、项目/Run。
- 不查询`Elasticsearch`，不实现跨 Pod 关键词日志检索。
- 不查询`Prometheus`，不嵌入真实`Grafana`看板。
- 不挂载生产`NFS`家目录；工作路径只写入容器`workingDir`与环境变量。
- 不引入字典模块、独立行级权限表、多租户或`KMS`。
- 不实现集群概览。

## Decisions

### 1. 业务任务表 + Volcano Job，命名空间固定`maip`

`train_job`保存表单快照（镜像、命令、环境变量、规格、挂载、运行用户、提交人、优先级、起止时间）。`Volcano Job`是调度真相：相位、Pod、中止。对象名即任务名称，须通过已有`kube.NormalizeJobName`（DNS-1123 子域兼`IsQualifiedName`，最长 63）。全部训练 Job/`ConfigMap`写入命名空间`maip`，提交时`EnsureNamespace`。

备选是不落业务表、只读集群 Job。拒绝：配置挂载快照、卡时、团队过滤、重跑回填都需要稳定业务字段；集群`CR`被`kind.down`删除后仍要保留历史。

停止任务：创建 Volcano`Command`（`AbortJob`），再把业务状态写成`cancelled`并记录`ended_at`。集群中`Job`已不存在时与已中止相同，视为成功并写`cancelled`，不把`Volcano job does not exist`返回给用户。不直接`Delete`，以便详情仍能读到中止后的`Job`相位。

相位映射：

| Volcano | 平台 |
| --- | --- |
| Pending | queued |
| Restarting / Completing | starting |
| Running | running |
| Completed | success |
| Failed | failed |
| Aborting / Aborted / Terminating / Terminated | cancelled |

列表先在数据库过滤/排序/分页，再对当前工作集群**一次**`ListJobs(maip)`刷新本页相位，禁止按行`GetJob`。

### 2. 一张 Worker Task，平台注入分布式环境变量

`spec.tasks`只有`worker`，`replicas=节点数`，`minAvailable=节点数`（Gang）。每副本请求`nvidia.com/gpu=每节点GPU`以及用户填写的`CPU`/内存。插件使用`env`与`svc`（不用`ssh`，避免 kind 无密钥失败）。

容器启动前注入：

| 变量 | 来源 |
| --- | --- |
| `GPU_NUM` | 每节点 GPU |
| `WORLD_SIZE` | 节点数 |
| `MASTER_PORT` | `23456` |
| `MASTER_ADDR` | `<job>-worker-0.<job>.maip.svc` |
| `RANK` | `VK_TASK_INDEX`（Volcano env 插件） |

用户启动命令通过`bash -lc`执行，可引用`$MASTER_ADDR`等。IB 由队列`features`决定，写入任务`require_ib`供展示；kind 节点未必有`maip.io/ib`，本迭代不加 IB`nodeSelector`，只加数据中心与卡型号选择器（`maip.io/datacenter`、`maip.io/gpu-type`）。

优先级`P0`–`P3`写入`spec.priority`：4000/3000/2000/1000。超额申请允许提交，由 Volcano 排队，与原型一致。

管理员提交必须指定平台`LDAP`用户作为运行身份（本地`admin`不能当`runAs`）。快照`owner_*`与`submitted_by_*`；普通用户运行身份即自己。本迭代不设置`securityContext.runAsUser`（模拟 LDAP 无`uidNumber`）。

配置挂载：先创建`Volcano Job`拿到`UID`，再按版本文件创建`ConfigMap`并只读挂到用户填写路径；默认`/data/hpc/home/<username>/experiments/<任务名>/configs`。`ConfigMap`写入指向该 Job 的`ownerReference`（`controller=true`），Job 删除时由 Kubernetes GC 级联销毁，无需平台再单独扫 ConfigMap。单个文件 ≤ 50 KB。

### 3. 可见性按团队成员，不引入权限表

管理员：当前工作集群内全部任务/队列/配置。其它用户：仅所属团队。配置`visibility=private`仅创建人（及管理员）可见。禁用或同步异常的队列不可用于新建任务；管理员在下拉中可见但不可提交。

跨模块只通过已有`Service`注入：训练服务依赖`cluster`/`queue`/`team`/`user`/`alert`（可选）。新增`team.ListIDsByUserID`、`user.MapByIDs`（批量，禁止循环查库）。`queue`增加按集群+团队返回完整队列投影，供「我的队列」一次装配额度与已用。

卡时 = `GPU`数 × 运行时长（排队不计）。本月卡时按`started_at`/`ended_at`与自然月交集在服务端聚合，不存流水表。

### 4. 配置集：草稿与不可变版本

表：`train_config_set`、`train_config_version`（文件 JSONB）、`train_config_draft`（每集一条，最后保存人所有）。发布校验`baseVersion==latestVersion`，冲突返回中文错误。归档后新建任务下拉不再出现，历史挂载快照仍可在任务详情展开。

列表筛选、分页在数据库完成；文件内容只在详情/草稿/指定版本接口返回。

### 5. 详情占位与真实 Pod 日志

| 页签 | 本迭代 |
| --- | --- |
| 配置信息 | 业务快照 |
| Pod 列表 | `ListJobPods` + 容器日志`GetPodLogs` |
| 任务监控 | 中文占位：后续嵌入 Grafana |
| 关联告警 | 当前集群告警的`node_names`与任务`pod_nodes`快照求交 |
| 日志检索 | 中文占位：后续对接 ES |

`pod_nodes`在拉取 Pod 列表时写回任务行，供告警关联，避免按告警循环问集群。

训练页工作集群选择复用浏览器本地存储。候选列表尚未返回时不得把已选 ID 当成无效并回退为第一项。`GET /api/training/clusters`返回精简投影（id/显示名/状态），`permission:"training"`，避免`algo`调用运维`/clusters`。

### 6. 复杂度判断

- 扩展已有`kube.ClusterClient`，不为训练再包一层集群客户端。
- 训练拆`trainjob`与`traincfg`两个 service 包，对应两个资源；「我的队列」由`trainjob`编排`queue`+任务聚合，避免第三套 CRUD。
- 不为卡时建流水表：任务行已有起止时间与 GPU 数。
- 不为实验分析预埋表。

## Risks / Trade-offs

- [kind 无 Device Plugin，申请`nvidia.com/gpu`可能 Pending] → 视为排队中，与 Volcano 行为一致；列表以相位为准。
- [AbortJob 依赖 Volcano Command] → 失败返回中文错误，不把业务状态写成已取消；`Job`不存在视为已停止。
- [无 NFS，容器工作路径可能不存在] → 镜像需自备目录；文档说明本迭代不挂家目录。
- [规则文件缺失] → 视觉对齐原型；文案中文；团队过滤代替行级权限模块；任务记录写明。
- [配置文件 JSONB 随版本变大] → 单文件 50 KB、列表不返回内容。

## Migration Plan

1. `make db.init`执行`005-training-center.sql`。
2. `make dao` / `make ctrl`。
3. 已有`kind`集群无需重建；首次提交会创建`maip`命名空间。
4. `algo`/`guoqiang`等 LDAP 用户需已在团队中（`make db.mock`已把`algo`加入 SLM 预训练与算法研究）。

回滚：丢弃开发库新表；删除命名空间`maip`不影响业务库。无线上数据。

## Open Questions

无阻塞问题。`ES`与`Grafana`地址待后续变更配置。

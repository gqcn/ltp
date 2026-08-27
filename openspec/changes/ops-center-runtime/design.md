## Context

当前仓库已有登录、数据中心和平台中心。运维中心侧栏只显示数据中心；数据中心关联节点/队列/集群计数恒为 0；团队详情隐藏队列入口。原型`prototype.v4`的运维中心还包含集群概览、集群管理、节点管理、队列管理、告警中心。本迭代实现后四者，底层对接`Kubernetes 1.27`与`Volcano 1.13`，告警对接企业内部`FastX`。

约束与上一迭代相同：`GoFrame v2`分层、`PostgreSQL`幂等 SQL、前端视觉以原型 CSS 为准、构造函数显式注入、禁止`N+1`。`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`、`.agents/rules/data-permission.md`仍缺失。

## Goals / Non-Goals

**Goals:**

- 管理员/`SRE`可用`Kubeconfig`接入集群，查看节点并做数据中心/标签/污点/隔离入池。
- 创建业务队列时在目标集群创建对应`Volcano Queue`，额度写入`capability`；启停映射`Open`/`Closed`。
- `FastX`可通过 Webhook 写入告警中心；运维可筛选、查看原始载荷并处理。
- 本地`make kind.up`创建`kind` 1.27 集群并用`Helm`安装`Volcano` 1.13；工作节点模拟`nvidia.com/gpu`，供节点用量、卡型号筛选和队列额度验收。
- 数据中心删除门禁与团队关联队列改为真实数据；去掉数据中心启停。

**Non-Goals:**

- 不实现集群概览（容量图、告警 KPI 仪表盘、组件健康总览）。
- 不实现训练中心、任务提交、卡时核算、队列「任务」跳转。
- 不实现真实`DCGM`/`IB`指标采集；节点温度/功耗在无指标时展示为「—」。
- 不引入字典模块、行级数据权限、多租户或独立权限表。
- 不对`Kubeconfig`做独立`KMS`；仅避免在 API 响应和日志中回传明文。
- 不接入真实`GPU`硬件或`NVIDIA Device Plugin`；本地`kind`用节点标签与`status`扩展资源模拟`nvidia.com/gpu`。

## Decisions

### 1. 集群凭证落库，运行时按集群构造客户端

`ops_cluster`保存显示名、说明与完整`Kubeconfig`。`GET`只返回`kubeconfigSet`，不返回明文。创建必须粘贴`Kubeconfig`；编辑留空表示沿用。连通成功后写入`api_server`、`k8s_version`、`last_sync_at`与状态。

`internal/service/kube`对外提供`Factory`：根据`Kubeconfig`字节构造`ClusterClient`。解析方式对齐 ACS`utility/kubeclient`：`clientcmd.Load` + `NewDefaultClientConfig`，并在 REST 配置缺 token 时从当前 context 的`AuthInfo.Token`回填`BearerToken`，以兼容 HTTP 反向代理接入。

接口覆盖：版本探测、节点列表、节点补丁、`Volcano Queue`应用/读取/启停/删除、`Volcano Job`创建/读取/注解补丁/前台级联删除。节点补丁对齐 ACS`k8s/node`与`gatewaynode`：`Merge Patch` + `resourceVersion`，冲突有限重试，目标态幂等跳过，禁止整对象`Update`；用量统计跳过正在删除与已结束的`Pod`，`InitContainer`取与应用容器的较大值。队列启停对齐 ACS`k8s/queue`：创建`bus.volcano.sh/v1alpha1 Command`（`OpenQueue`/`CloseQueue`），不直接改`status.state`。`Volcano Job`对齐 ACS`k8s/job ISchedulerJob`：创建传入完整`Job`对象（含`Tasks`），删除使用`Foreground`与可选`UID`前提。本迭代不提供训练中心 HTTP 提交入口。生产用`volcano.sh/apis`类型化客户端；单元测试注入替身。

列表与 KPI 对齐 ACS Gateway 集群巡检：按`clusterId`缓存节点快照约 1 秒，避免同一请求内列表页与汇总重复`List Nodes`；凭证更新、探测失败或删除时丢弃缓存。失败结果同样短缓存，避免对不可达集群连续打 API。不缓存客户端创建失败。

备选是每集群常驻 informer。拒绝：本迭代节点规模小、页面按需刷新即可，informer 增加生命周期复杂度。

### 2. 工作集群是前端状态，接口用`clusterId`过滤

多集群对等，无主/次角色。壳层顶栏提供工作集群选择，持久化到浏览器本地存储。节点、队列、告警列表以`clusterId`为必填过滤（告警列表允许「全部集群」）。集群列表本身是全局资源。

不把工作集群写入服务端会话：避免多标签页互相覆盖。

### 2.1 表单校验用`zod`与`react-hook-form`，服务端中文兜底

控制台表单提交不依赖浏览器原生`required`气泡（其语言跟随浏览器 UI，常见英文`Please fill out this field`），也不把空值直接交给 GoFrame 默认英文句`The DisplayName field is required`。

客户端规则用`zod`声明，表单状态、错误展示与首个无效域聚焦交给`react-hook-form`（`@hookform/resolvers`）。错误仍写在对应输入域下方，文案保持中文。不再维护自研`issueIfBlank`/`useFieldErrors`校验引擎。

默认长度：单行文本最长 64 个字符，多行文本最长 256 个字符。特例不套用默认值：`DNS-1123`标识最长 63、展示色 7 位 hex、角色名称最长 32、`Kubeconfig`为完整 YAML、节点标签与污点的`key`/`value`遵循`Kubernetes` qualified name 与 label value（名称与 value 最长 63，带前缀的 key 最长 317）。服务端 DTO`v`标签与前端一致。节点标签/污点表单在添加与保存时按上述语法校验，中文错误写在对应输入域旁。

弹层使用`@radix-ui/react-dialog`承载现有`.modal`样式（焦点陷阱、Esc、滚动锁定）。Toast 使用已引入的`sonner`承载队列与计时，视觉必须覆盖其默认叠卡片与绝对定位，恢复原型的左色条卡片、右上纵向排列、无图标。`Button`、`Field`、`Pagination`、`ColorField`是原型样式的薄封装或产品交互，不替换成整套 UI 库。

服务端仍保留校验：DTO`v`标签带中文消息；业务层必填/格式错误使用中文`bizerr`；响应中间件把残留的 GoFrame 英文校验句翻译为中文。不引入`i18n`语言包。

### 3. 节点以 Kubernetes 为真相，维护记录落库

节点不镜像到业务表。列表从当前集群`Node`对象投影：

| 展示 | 来源 |
| --- | --- |
| 名称 / IP / Ready / 可调度 | `Node`状态与`spec.unschedulable` |
| 数据中心 | 标签`maip.io/datacenter` |
| GPU 型号 | 标签`maip.io/gpu-type`，缺省回落`nvidia.com/gpu.product` |
| IB | 标签`maip.io/ib`或`maip.io/ib-domain` |
| GPU/CPU/内存用量 | `status.allocatable`与已分配（Pod 请求批量汇总，禁止逐节点循环查 API） |
| 隔离 | `unschedulable`或存在`maip.io/fault=true:NoSchedule`污点 |

分配数据中心：写入/清除`maip.io/datacenter`。停用数据中心不可新分配，已有标签仍展示。隔离：`cordon`并加上故障污点与标签。入池：`uncordon`并移除故障污点/标签。每次变更写入`ops_node_event`。节点列表「隔离信息」取当前页已隔离节点最近一次成功`isolate`记录的备注，一次`IN`查询装配，未隔离或无记录时展示「已隔离」/`—`。

节点列表在服务端过滤后分页。单集群节点按一次`List Nodes`+一次`List Pods`装配，不按节点循环调用 API。

### 4. 业务队列与 Volcano Queue 一一对应

`ops_queue.name`即`Volcano Queue`对象名，创建后不可改。名称须为 Kubernetes DNS-1123 子域（允许点，最长 63，因同时用作 Pod 标签值），且不得为`root`/`default`。`Volcano Job`的`metadata.name`另须通过 webhook 的`IsQualifiedName`；`spec.tasks[].name`须为 DNS-1123 label。创建流程：校验集群可连 → 应用`Queue` CR（`capability`含`cpu`/`memory`/`nvidia.com/gpu`，注解写入数据中心、卡型号、功能特性）→ 事务写入`ops_queue`与`ops_queue_team`。CR 失败则不落库。

| 平台字段 | Volcano |
| --- | --- |
| `name` | `metadata.name` |
| `gpuQuota`/`cpuQuota`/`memQuotaGi` | `spec.capability` |
| `weight` | `spec.weight`，默认 1 |
| `reclaimable` | `spec.reclaimable` |
| 启用 / 禁用 | 创建 Volcano `Command`：`OpenQueue` / `CloseQueue`（由控制器把队列置为 Open/Closed） |
| 已用 | `status.allocated` |

功能特性（如`ib`）只作为平台注解与筛选条件，本迭代不写`nodeGroupAffinity`（训练任务调度时再生效）。已用/排队数以`Volcano`状态为准；无 CR 或离线时已用为 0，列表仍返回业务元数据并中文标明同步异常。`GET`列表不写集群；运维可点「重新同步」（`POST /queues/{id}/sync`）按库中元数据`ApplyQueue`。`make kind.down`会丢掉 CR，这是预期环境行为。

删除：若`status.running`或`pending`大于 0 则拒绝；否则删 CR 再软删业务行并解除团队关联。

队列额度预览：按数据中心聚合当前集群节点容量，减去同数据中心、同卡型号其他队列额度。卡型号只来自节点`maip.io/gpu-type`或`nvidia.com/gpu.product`；无标签节点仍计入`CPU`/内存总量，但不得生成`cpu`这种占位型号。其他队列声明了节点上不存在的型号时，不把该型号列入下拉。创建/更新时服务端按同一套剩余量拒绝超额（`GPU`按卡型号，`CPU`/内存按数据中心合计）；预览仅展示，最终以服务端为准。本地`kind`在模拟`GPU`就绪后，额度预览按节点`allocatable`计算；若集群是旧的单控制面拓扑，需`make kind.down && make kind.up`重建。

### 5. FastX Webhook 公开入口，会话 API 走运维权限

公开：`POST /api/webhooks/fastx/alerts`。不走会话鉴权。配置`ops.fastx.webhookToken`非空时，请求必须携带相同`X-FastX-Token`或`token`查询参数，否则拒绝。空令牌仅用于本地。

解析约定：

- 标题：`alarmInfo.name`，空则用`originalBody.faultName`
- 告警信息：由`alarmData`行数、主机名与指标名生成简述
- 故障信息：`originalBody.faultName`
- 级别：`alarmInfo.level`，`1=info`、`2=warning`、`>=3=critical`，缺省`warning`
- 节点：从`alarmData`标签解析`Hostname`或`instance`，去重后逗号拼接；无法解析则为空
- 首次告警时间：`alarmInfo.firstAlarmTime`
- 原始 JSON 完整入库

处理状态：`open` / `following` / `handled`。处理接口写备注、处理人与时间。训练任务尚未启用，「查看任务」入口隐藏；有故障信息且能解析单一节点名时可跳转节点管理。

### 6. 模块启停与跨模块装配

已启用模块扩展为：数据中心、集群、节点、队列、告警、平台中心。集群概览与训练中心仍禁用，侧栏完全隐藏。

数据中心`UsageCounter`改为真实实现：队列按`ops_queue.datacenter_code`批量`COUNT`；节点/集群按各已接入集群一次拉节点后按标签聚合。某集群离线时该集群贡献 0，不使整个计数失败。

团队详情增加`queues`投影（id、名称、显示名、数据中心、状态），由队列服务按团队 ID 批量查询；无关联返回空数组。

跨模块只通过已有`Service`接口注入：队列依赖集群/`kube`/`team`；节点依赖集群/`kube`/数据中心；告警依赖可选集群存在性校验。禁止把`DAO`或`client-go`对象泄漏到控制器。

### 7. 本地 kind 实验集群

`hack/deploy/kind/`提供集群配置与脚本，做法对齐[使用 Kubernetes Kind 模拟 AI 算力测试集群](https://johng.cn/cloud-native/kubernettes-kind-mock-ai-test-cluster)与`gqcn/kind-mock-ai-cluster`：

- 镜像`kindest/node:v1.27.16`（或同系列 1.27.x），集群名`ltp`
- 1 个 control-plane（无`GPU`，保持未分配数据中心）+ 3 个 worker，分别模拟`NVIDIA-H200`、`NVIDIA-H800`、`NVIDIA-GeForce-RTX-4090`，各 8 卡
- Worker 注册名为`gpu-node-h200`等；写入`maip.io/gpu-type`、`nvidia.com/gpu.product`、`nvidia.com/gpu.count`，以及`maip.io/datacenter=cq-lj`（对接`make db.mock`后的重庆两江；内置`default`数据中心已移除）
- 用`kubectl patch --subresource=status`把`nvidia.com/gpu`写入`capacity`/`allocatable`
- `kubelet`会覆盖未知扩展资源，因此在控制面容器安装`systemd`回填进程（失败则`docker exec -d`兜底），按`nvidia.com/gpu.present`节点的`nvidia.com/gpu.count`持续写回
- `Helm`安装`volcano-sh/volcano` chart`1.13.0`到`volcano-system`

不引入`nvml-mock`、假设备插件或`MIG`/`MPS`子资源：平台列表只读`nvidia.com/gpu`，多一层组件不能提高本迭代验收。已有单节点`ltp`集群无法在线加 worker，`make kind.up`会提示`make kind.down && make kind.up`。

`make kind.up` / `make kind.down`。平台「接入集群」粘贴`kind get kubeconfig --name ltp`输出。Webhook 本地地址为`http://127.0.0.1:8000/api/webhooks/fastx/alerts`。

### 8. 复杂度判断

- `kube.ClusterClient`接口：隔离外部集群与测试替身，是已确认变化点。
- 不为节点建镜像表：避免双写；维护记录才需要审计。
- 不为告警对接`Alertmanager`：本迭代真相是`FastX`Webhook。
- 不引入字典表：状态集合固定。
- 队列不预埋任务外键。

## Risks / Trade-offs

- [`kubelet`覆盖扩展资源] → 控制面回填进程按标签写回`nvidia.com/gpu`；`kind.up`在容量可见前等待。
- [`Kubeconfig`明文存库] → 与`LDAP`绑定密码相同策略；API/日志不回传；后续可加配置密钥封装。
- [Volcano 关闭队列需改`status.state`] → 封装在`kube`客户端，失败时返回明确业务错误，不把 CR 状态与库状态长期分叉（以 CR 为准刷新列表）。
- [Webhook 无会话] → 生产必须配置共享令牌；文档强调内网与令牌。
- [多集群 List 节点做数据中心计数] → 集群数预期个位数；单集群一次 List，禁止 N+1。
- [规则文件缺失] → 视觉对齐原型，文案中文，无行级数据权限；任务记录写明。

## Migration Plan

1. `make db.init`执行`004-ops-center-runtime.sql`。
2. `make dao` / `make ctrl`。
3. 安装`kind`与`Helm`后执行`make kind.up`。
4. 控制台接入该集群的`Kubeconfig`，创建队列并`kubectl get queue`核对。
5. 按文档`curl`推送示例`FastX` JSON，在告警中心可见。

回滚：丢弃开发库新表；删除`kind`集群不影响业务库。无线上数据。

## Open Questions

无阻塞问题。集群概览与训练任务留待后续变更。

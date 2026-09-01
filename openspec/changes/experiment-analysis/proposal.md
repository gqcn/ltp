## Why

训练中心已能提交`Volcano Job`并查看`Pod`日志，但`prototype.v4`的实验分析仍隐藏。算法同学无法按项目浏览`Run`、无法从任务跳到实验、也无法在平台外层看到`Loss`、进度和吞吐。完整曲线应继续由任务所在机房的`TensorBoard`提供；控制面不能挂各机房`NFS`，也不把几十`MB`的`tfevents`拷进对象存储或拆成时序表。

## What Changes

- 训练中心侧栏开放「实验分析」：项目侧栏、`Run`列表、详情、对比；对齐`prototype.v4`。
- 提交训练任务时注入`TENSORBOARD_LOGDIR`，可选指定实验项目，并自动创建关联`Run`（本迭代不做无任务的离线实验）。打开实验列表时为尚无`Run`的历史任务补建。
- 任务详情展示关联实验入口；实验详情可跳回任务。列表与详情外层展示最新`Loss`、当前`step`、吞吐；未读到则显示`—`。
- 外层数字来自`PostgreSQL`快照。快照由平台在任务所在机房创建短命读盘`Job`，解析`tfevents`标量后经`Pod`日志回写；训练脚本不增加上报`SDK`。
- 详情「`TensorBoard` / 曲线」页签按需在同机房拉起`TensorBoard`进程，经平台会话反代嵌入；空闲回收。跨机房不叠完整曲线。
- 读指标与打开看板共用同一实验代理镜像（`metrics` / `serve`两种命令）。实验模块自动创建、对账、维护这两类对象，禁止手工维护。
- **不**把`tfevents`、`swanlog`、`checkpoint`导入数据库或`COS`/`MinIO`。**不**自研完整曲线图。**不**接入`SwanLab`。

## Capabilities

### New Capabilities

- `experiment-projects`：实验项目的创建、编辑描述、删除；名称创建后只读。
- `experiment-runs`：`Run`列表、详情、对比、移动项目、删除、历史任务补建、与训练任务互跳、外层指标快照。
- `experiment-agents`：实验代理镜像、读盘`Job`、看板`Pod`、对账循环与`TensorBoard`反代。

### Modified Capabilities

- `ops-console-shell`：训练中心侧栏增加实验分析；实验页使用工作集群选择。
- `console-access`：拥有训练菜单的会话可见实验分析，不再隐藏。
- `training-jobs`：提交时注入`TENSORBOARD_LOGDIR`、可选指定实验项目并创建关联`Run`；详情与列表展示关联实验及外层快照。

## Impact

- 后端：新增`exp_project`、`exp_run`表（`006-experiment-analysis.sql`）；`exprun`/`expproject`服务；首次引入`service/cron`注册对账任务；扩展`kube.ClusterClient`（普通`Job`/`Pod`/`Service`、按标签列出、`Pod`代理）；训练`API`增加实验资源与看板反代。
- 前端：实验分析路由与页面；任务列表/详情关联入口与快照列；视觉对齐`prototype.v4`。
- 运行时：`kind`加载实验代理镜像；代理`Pod`落在训练命名空间`maip`，不申请`GPU`、不进`Volcano`队列。
- 测试：项目/`Run`/对账单元测试；E2E覆盖菜单、项目、列表空态、任务互跳、未上报显示`—`。本地无`NFS`时读盘失败不得拖垮页面。
- `i18n`：不引入语言包，运行时文案用中文。
- 数据权限：按团队成员过滤，管理员可见当前工作集群全部；不引入独立权限表。
- 字典模块：不引入；代理角色、`Run`展示态用`Go`命名类型。
- 规则文件`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`、`.agents/rules/data-permission.md`仍缺失，以前端原型、中文文案和团队过滤为准。

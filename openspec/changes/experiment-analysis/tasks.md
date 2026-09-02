## 1. 数据与 kube 扩展

- [x] 1.1 新增`006-experiment-analysis.sql`：`exp_project`、`exp_run`、索引、默认项目 Seed；可选 mock 数据文件
- [x] 1.2 把新表加入`gfcli` dao 清单，执行`make db.init`与`make dao`
- [x] 1.3 扩展`kube.ClusterClient`：普通`batch/v1 Job`、`Pod`、`Service`的创建/按标签列出/删除，以及`Pod`端口代理；更新`Fake`与单测

## 2. 实验后端

- [x] 2.1 定义实验项目、`Run`列表/详情/对比、打开看板、看板反代 API（`permission:"training:experiment:*"`），执行`make ctrl`
- [x] 2.2 实现`expproject`：创建、改描述、删除（默认项目不可删，其下`Run`改挂`default`）、名称唯一与只读
- [x] 2.3 实现`exprun`：按任务幂等`EnsureForJob`（可指定项目）、列表筛选分页、详情、对比投影、移动项目、删除、历史任务补建、批量按`job_id`装配快照
- [x] 2.4 `trainjob`提交时注入`TENSORBOARD_LOGDIR`（用户已填则不覆盖）并调用`EnsureForJob`；失败不回滚训练任务
- [x] 2.5 实现`exprun.Reconcile`：按集群标签对账`metrics Job`与`serve Pod`，解析读盘`JSON`回写快照，空闲回收看板
- [x] 2.6 新增`service/cron`，注册对账任务；`cmd`启动时`cron.Start`；装配训练控制器依赖
- [x] 2.7 补充`expproject`/`exprun`/`kube`/训练注入路径单元测试

## 3. 实验代理镜像

- [x] 3.1 新增`hack/deploy/experiment-agent`：`metrics`（`EventAccumulator` + 别名表 + 一行`JSON`）与`serve`（`tensorboard`）
- [x] 3.2 `kind`构建并加载该镜像；文档说明无`NFS`时读盘失败为`—`

## 4. 控制台前端

- [x] 4.1 侧栏开放实验分析；实验页工作集群选择；更新 E2E 中「实验分析不可见」
- [x] 4.2 实验列表：项目侧栏、筛选分页、快照列、勾选对比
- [x] 4.3 项目新建/编辑/删除弹层；`Run`移动与删除；创建任务可选项目
- [x] 4.4 `Run`详情：外层快照、任务跳转、`TensorBoard`反代页签、超参、概览路径
- [x] 4.5 对比页：快照、超参 Diff、同机房才提供`TensorBoard`对比
- [x] 4.6 任务列表`Loss`/进度列；任务详情关联实验横幅；更新`README.md`

## 5. 验证

- [x] 5.1 运行`Go`测试与`make lint`
- [x] 5.2 新增训练中心 E2E：`algo`可见实验分析、项目创建与重名、删除项目、空列表`—`、任务提交后存在`Run`、任务详情跳转实验、移动与删除`Run`
- [x] 5.3 有集群时对账可创建带实验标签的对象；无`NFS`时记录读盘失败剩余风险

5.3 剩余风险：本地`kind`节点没有真实`/data/hpc/home` `NFS`，`metrics Job`会失败，外层保持`—`；对账仍会创建带`maip.io/agent=experiment`的对象。生产需在训练节点挂载网络盘后再验证真实曲线。本会话未对运行中的`kind`集群做一次实读盘验收。

## 6. 反馈

- [x] 6.1 实验分析页展示项目描述：侧栏项目项与选中后的主区域；E2E 覆盖创建后可见
- [x] 6.2 项目编辑/删除移到选中后的右侧；允许改名（默认项目名称只读）；更新 API 与 E2E
- [x] 6.3 侧栏不再展示项目描述（只保留右侧）；侧栏项目列表分页；创建后翻到所在页；更新 E2E

规则域：`openspec`、`documentation`、`testing`命中。`architecture`无影响（不改模块边界与装配路径）。`api-contract`无影响（不改 HTTP 契约；侧栏分页在前端切片，因任务创建下拉与移动弹层仍需完整候选）。`backend-go`、`database`无影响。`.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`仍缺失：视觉对齐`prototype.css`，文案用中文，无独立语言包。`.agents/rules/data-permission.md`仍缺失：按团队成员过滤`Run`。不引入字典模块。

- [x] 6.4 成功实验外层`Loss`/进度/吞吐为空：根因是训练`Job`未挂`/data/hpc/home`，演示任务也不写`tfevents`，读盘`Job`与训练可能落在不同节点。训练`Job`挂个人盘与共享盘；代理镜像增加`demo`命令写入`lm loss`/`tokens_per_sec`/`max_steps`；读盘与看板按训练任务卡型号选节点；`kind`工作节点`extraMounts`共享宿主机目录；新建任务可「填入本地演示训练」；对账解析`maxSteps`并按真实 Pod 读日志。E2E `TC024`覆盖列数据与打开`TensorBoard`。

规则域：`openspec`、`documentation`、`testing`、`backend-go`、`architecture`、`api-contract`命中。`api-contract`无 HTTP 字段增删，仅回写已有`maxSteps`。`database`无影响（沿用`006`列）。`.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`仍缺失。

- [x] 6.5 看板不走`kubectl port-forward`：浏览器只访问当前服务`/api/training/experiments/{id}/board/`。容器内`TensorBoard`绑`127.0.0.1`，6006 为标准`HTTP`入口，平台经`API Server`的`Pod`反代嵌入页签。

规则域：`openspec`、`documentation`、`testing`、`backend-go`、`api-contract`命中。`database`无影响。

## Why

运维中心与平台中心已经可验收，但算法工程师登录后仍落到空态页。`prototype.v4`训练中心的任务列表、新建任务、任务详情、我的队列与配置管理尚未落地，而训练作业需要真正提交为`Volcano Job`才能在已接入集群上调度。本迭代对齐上述页面，刻意不实现实验分析，也不对接`Elasticsearch`日志检索与`Prometheus`/`Grafana`任务监控。

## What Changes

- 壳层启用训练中心：任务列表、新建任务、我的队列、配置管理；**不**开放实验分析。
- 训练任务：按工作集群提交、列表筛选、详情、停止、重跑；底层创建/读取/中止`Volcano Job`，配置集以`ConfigMap`只读挂载。
- 任务详情保留「日志检索」与「任务监控」页签，本迭代只展示后续对接占位，不查询`ES`/`Prometheus`，不嵌入`Grafana`。
- 任务详情「Pod 列表」读取集群内真实`Pod`与容器日志（`Kubernetes`日志 API，不是`ES`）。
- 我的队列：当前用户所属团队的队列额度、占用、本月卡时与活跃任务；可跳转提交任务。
- 配置管理：多文件`YAML`/`JSON`配置集、个人草稿、不可变版本发布、任务挂载。
- 算法工程师登录进入任务列表；管理员/`SRE`侧栏同时可见训练中心。
- 告警中心在能关联到训练任务时展示「查看任务」。

## Capabilities

### New Capabilities

- `training-jobs`：训练任务提交、列表、详情、停止、重跑；映射`Volcano Job`；Pod 与容器日志；日志检索/任务监控占位。
- `training-my-queues`：用户侧队列额度、占用、卡时与活跃任务。
- `training-configs`：配置集草稿、版本发布、列表筛选与任务挂载。

### Modified Capabilities

- `ops-console-shell`：侧栏开放训练中心四菜单；训练页使用工作集群选择；实验分析仍隐藏。
- `console-access`：已启用模块增加`training`；`algo`进入任务列表而非空态页。
- `queue-management`：禁用或同步异常的队列不可被新建任务选中。
- `alert-center`：训练中心启用后，能关联到任务时展示「查看任务」。

## Impact

- 后端：新增训练任务/配置集表；扩展`kube.ClusterClient`（命名空间、`ConfigMap`、Job 中止、Pod/日志）；训练 API（`permission:"training:*"`）；团队按用户查成员关系。
- 前端：训练中心路由与四类页面；壳层菜单与工作集群；视觉继续对齐`prototype.v4`。
- 测试：任务/配置服务单元测试；训练中心 E2E（菜单、空态、表单校验、配置草稿/发布）。本地`kind`+`Volcano`用于提交任务验收。
- `i18n`：不引入语言包，运行时文案用中文。
- 数据权限：不引入独立权限表；按团队成员关系过滤任务/队列/配置，管理员可见全部。`.agents/rules/data-permission.md`仍缺失，以此作为可验收来源。
- 字典模块：不引入；状态/优先级/可见性用 Go 命名类型。
- 规则文件`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`仍缺失，以前端原型与中文文案为准。

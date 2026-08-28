## ADDED Requirements

### Requirement: 提交训练任务时创建 Volcano Job

拥有训练中心菜单的会话 MUST 能在当前工作集群提交训练任务。必填：任务名称、工作路径、优先级、所属团队、资源队列、节点数、每节点`GPU`数、每节点`CPU`、每节点内存、容器镜像、启动命令。任务名称 MUST 符合`Volcano Job`对象名：Kubernetes DNS-1123 子域且通过`IsQualifiedName`，最长 63。每节点`GPU` MUST 为 1–8。镜像 MUST 为`registry/path:tag`形式。本地管理员 MUST 指定一名已启用的平台`LDAP`用户作为运行身份，不得以`admin`运行。普通用户的运行身份为自己。`GPU`型号与是否使用`IB` MUST 取自所选队列，不可改。队列 MUST 属于所选团队、处于启用且与`Volcano Queue`同步正常；否则拒绝提交。申请量超过队列当前剩余额度时 MUST 仍允许提交并进入排队。创建成功 MUST 在命名空间`maip`存在同名`batch.volcano.sh/v1alpha1 Job`，含`worker`任务（副本数=节点数）、`minAvailable`等于节点数，并向容器注入`$MASTER_ADDR`、`$MASTER_PORT`、`$WORLD_SIZE`、`$RANK`、`$GPU_NUM`。可选配置挂载 MUST 使用已发布版本的文件创建`ConfigMap`并只读挂载；`ConfigMap` MUST 设置指向该`Volcano Job`的`ownerReference`（`controller=true`），以便 Job 对象销毁时由 Kubernetes 级联删除`ConfigMap`。前端 MUST 在提交时用中文错误写在输入域旁并聚焦。

#### Scenario: 提交后集群中可见 Volcano Job

- **WHEN** 算法工程师选择已启用队列并填写合法名称、镜像与启动命令后提交
- **THEN** 任务列表出现该任务，且目标集群`maip`命名空间存在同名`Volcano Job`

#### Scenario: 非法任务名称被拦截

- **WHEN** 用户填写任务名称`SLM_Job`并提交
- **THEN** 输入域旁展示中文错误，不创建业务任务与`Volcano Job`

#### Scenario: 禁用队列不可提交

- **WHEN** 用户选择已禁用或同步异常的队列并提交
- **THEN** 接口返回中文业务错误，集群中不新增 Job

#### Scenario: 管理员未指定运行用户被拦截

- **WHEN** 本地管理员不选择运行用户即提交
- **THEN** 运行用户输入域旁展示中文错误，不创建任务

#### Scenario: 超额申请进入排队

- **WHEN** 队列剩余 2 卡，用户申请 8 卡且其它必填合法
- **THEN** 任务创建成功，状态为排队中

#### Scenario: 配置挂载 ConfigMap 归属 Volcano Job

- **WHEN** 用户提交任务并挂载已发布配置集
- **THEN** 集群`maip`命名空间存在对应`ConfigMap`，其`ownerReference`指向该`Volcano Job`；删除 Job 后`ConfigMap`被级联删除

### Requirement: 任务列表按团队过滤并展示生命周期操作

列表 MUST 支持按关键词、团队、队列、状态、优先级筛选并分页。筛选与分页 MUST 在数据库完成后再批量刷新当前页`Volcano`相位，禁止按行查询集群。非管理员 MUST 只能看到所属团队的任务；管理员可见当前工作集群全部任务。每行 MUST 展示名称、状态、优先级、团队/队列、数据中心、资源、时长、创建人、创建时间。名称列 MUST 只展示`Volcano Job`对象名（Kubernetes DNS-1123 子域且通过`IsQualifiedName`，最长 63），不得在名称下方展示数据库数字 ID。运行中、启动中、排队中 MUST 提供停止；其余终态 MUST 提供重跑。排队中任务 MUST 按优先级`P0`到`P3`再按创建时间排序，其它状态按创建时间倒序。

#### Scenario: 任务列表不展示数字 ID

- **WHEN** 用户打开任务列表且存在名称为`slm-7b-pretrain-phase4`的任务
- **THEN** 名称列仅展示该 Kubernetes 对象名，不在名称下方展示数据库 ID

#### Scenario: 算法工程师只看到本团队任务

- **WHEN** `algo`属于「SLM预训练」而不属于「数据工程」，列表无筛选
- **THEN** 不出现「数据工程」团队的任务

#### Scenario: 切换工作集群后任务列表只显示该集群任务

- **WHEN** 管理员在任务列表将工作集群从 A 切换为 B
- **THEN** 列表刷新为集群 B 的任务，不再显示仅属于 A 的任务

#### Scenario: 停止任务后状态为已取消

- **WHEN** 用户对排队中或运行中的任务确认停止
- **THEN** 集群对该`Volcano Job`执行`AbortJob`，列表状态变为已取消

#### Scenario: 停止时集群中已无 Volcano Job 视为已取消

- **WHEN** 用户对排队中或运行中的任务确认停止，且目标集群`maip`中不存在同名`Volcano Job`
- **THEN** 接口成功，列表状态变为已取消，不返回`Volcano job does not exist`

### Requirement: 任务详情展示配置、Pod 日志、告警，并占位监控与日志检索

详情 MUST 展示配置快照（资源、镜像、命令、环境变量、工作路径、配置挂载文件）。「Pod 列表」MUST 列出该 Job 的 Pod，并可查看所选容器日志（`Kubernetes`日志 API）。「关联告警」MUST 展示当前集群中节点名与该任务`Pod`节点有交集的告警。「任务监控」MUST 展示后续将嵌入`Grafana`的说明，不得查询`Prometheus`。「日志检索」MUST 展示后续将对接`Elasticsearch`的说明，不得查询`ES`。重跑 MUST 回填源任务表单并提交为新任务，可带`rerunFromId`。

#### Scenario: 详情打开配置信息

- **WHEN** 用户从列表进入任务详情
- **THEN** 默认页签为配置信息，可见镜像、启动命令与挂载路径

#### Scenario: 日志检索与监控为占位

- **WHEN** 用户打开「日志检索」或「任务监控」页签
- **THEN** 页面说明本迭代不查询`ES`/`Prometheus`，不出现检索结果表格或监控曲线

#### Scenario: 重跑创建新任务

- **WHEN** 用户对已结束任务点重跑并提交
- **THEN** 新建一条任务，详情可见重跑自源任务

#### Scenario: 管理员选中运行用户后锁定选择器

- **WHEN** 本地管理员在创建任务页检索并点选一名已启用的平台`LDAP`用户
- **THEN** 检索框变为只读并展示「姓名（账号）」，右侧可清除；下方 chip 含姓名、账号与部门；候选列表关闭

#### Scenario: 管理员重跑回填运行用户

- **WHEN** 本地管理员对已有任务打开重跑页，且源任务运行身份仍是已启用的平台`LDAP`用户
- **THEN** 运行用户选择器预选该用户并锁定，工作路径保持源任务值

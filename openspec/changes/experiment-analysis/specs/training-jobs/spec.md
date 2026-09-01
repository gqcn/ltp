## ADDED Requirements

### Requirement: 提交任务时注入 TensorBoard 目录并创建关联 Run

创建训练任务成功后，系统 MUST 向训练容器注入`TENSORBOARD_LOGDIR=/data/hpc/home/<运行用户账号>/outputs/<任务名>/tensorboard`，除非用户环境变量已包含该键。系统 MUST 幂等创建一条指向该任务的`exp_run`，并写入同一`tb_logdir`。请求可带可选`projectId`；省略或 0 时项目为 Seed`default`，指定时 MUST 挂到该未删除项目。创建`Run`失败 MUST NOT 回滚已提交的`Volcano Job`。

#### Scenario: 新任务带有约定 logdir 与 Run

- **WHEN** 算法工程师成功提交名称为`slm-7b-pretrain-phase4`、运行用户为`guoqiang`的任务
- **THEN** 该任务环境变量含`TENSORBOARD_LOGDIR=/data/hpc/home/guoqiang/outputs/slm-7b-pretrain-phase4/tensorboard`，且存在关联`Run`

#### Scenario: 用户已填写同名环境变量时不覆盖

- **WHEN** 提交时用户环境变量已包含`TENSORBOARD_LOGDIR=/custom/tb`
- **THEN** 容器中该键仍为`/custom/tb`，关联`Run`的`tb_logdir`与该值一致

#### Scenario: 提交时可指定实验项目

- **WHEN** 算法工程师提交任务并选择项目`slm-7b-pretrain`
- **THEN** 关联`Run`属于该项目，而不是「默认项目」

### Requirement: 任务列表与详情展示关联实验及外层快照

任务列表 MUST 增加最新`Loss`与进度列，数据来自关联`Run`快照；未关联或未上报 MUST 显示`—`。任务详情 MUST 展示关联实验入口，可跳转到对应`Run`详情。装配 MUST 对当前页任务一次批量查询`Run`，禁止按行查询。

#### Scenario: 列表展示已回写的 Loss

- **WHEN** 任务关联`Run`的`last_loss`为`1.822`且`last_step`为`21000`
- **THEN** 任务列表该行可见`1.822`与对应进度，而不是`—`

#### Scenario: 详情可跳到实验

- **WHEN** 用户在任务详情点击关联实验
- **THEN** 进入对应`Run`详情

## MODIFIED Requirements

### Requirement: 任务列表按团队过滤并展示生命周期操作

列表 MUST 支持按关键词、团队、队列、状态、优先级筛选并分页。筛选与分页 MUST 在数据库完成后再批量刷新当前页`Volcano`相位，禁止按行查询集群。非管理员 MUST 只能看到所属团队的任务；管理员可见当前工作集群全部任务。每行 MUST 展示名称、状态、优先级、团队/队列、数据中心、资源、时长、创建人、创建时间，以及关联实验快照中的`Loss`与进度（无快照则为`—`）。名称列 MUST 只展示`Volcano Job`对象名（Kubernetes DNS-1123 子域且通过`IsQualifiedName`，最长 63），不得在名称下方展示数据库数字 ID。运行中、启动中、排队中 MUST 提供停止；其余终态 MUST 提供重跑。排队中任务 MUST 按优先级`P0`到`P3`再按创建时间排序，其它状态按创建时间倒序。

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

详情 MUST 展示配置快照（资源、镜像、命令、环境变量、工作路径、配置挂载文件）以及关联实验入口。「Pod 列表」MUST 列出该 Job 的 Pod，并可查看所选容器日志（`Kubernetes`日志 API）。「关联告警」MUST 展示当前集群中节点名与该任务`Pod`节点有交集的告警。「任务监控」MUST 展示后续将嵌入`Grafana`的说明，不得查询`Prometheus`。「日志检索」MUST 展示后续将对接`Elasticsearch`的说明，不得查询`ES`。重跑 MUST 回填源任务表单并提交为新任务，可带`rerunFromId`。

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

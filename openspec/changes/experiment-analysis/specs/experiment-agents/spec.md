## ADDED Requirements

### Requirement: 平台自动维护读盘 Job 与看板 Pod

系统 MUST 用同一实验代理镜像在任务所在集群、所在机房创建两类对象：`metrics`短`Job`用于读取`tfevents`标量；`serve`长`Pod`与`ClusterIP`用于`TensorBoard`。对象 MUST 落在命名空间`maip`，MUST NOT 申请`nvidia.com/gpu`，MUST NOT 绑定`Volcano Queue`。对象 MUST 带`maip.io/agent=experiment`与`maip.io/role`、`maip.io/run-id`标签。`ownerReference` MUST NOT 指向训练`Volcano Job`。创建、检测、回收 MUST 由实验模块对账完成，禁止依赖手工`kubectl`。对账 MUST 按集群一次按标签列出对象，禁止按`Run`循环查询集群。

#### Scenario: 运行中的任务会拉起读盘 Job

- **WHEN** 一条关联运行中任务的`Run`快照过期且集群中没有未完成的`metrics Job`
- **THEN** 对账在该任务机房创建`metrics Job`

#### Scenario: 读盘成功后回写快照并删除 Job

- **WHEN** `metrics Job`成功且标准输出为一行合法标量`JSON`
- **THEN** `Run`的`last_loss`或对应空字段被更新，该`Job`随后被删除

#### Scenario: 无人查看时不常驻 TensorBoard

- **WHEN** 一条`Run`的`board_accessed_at`为空或已超过空闲窗口
- **THEN** 集群中不保留该`Run`的`serve Pod`

### Requirement: 打开 TensorBoard 须经平台会话反代

用户打开「`TensorBoard` / 曲线」时，系统 MUST 记录访问时间、确保`serve`就绪，并返回同源反代前缀。反代 MUST 使用当前会话鉴权，经集群`API Server`访问`Pod`端口，MUST NOT 把`6006`暴露为公网或未鉴权地址。训练脚本 MUST NOT 为打开看板增加上报逻辑。`iframe`若因路径前缀无法完整加载，页签 MUST 仍提供新标签打开同一反代地址。

#### Scenario: 有权限用户可以打开看板入口

- **WHEN** 算法工程师打开本团队一条`Run`的`TensorBoard`页签
- **THEN** 系统为该`Run`确保`serve`并给出同源反代地址

#### Scenario: 无权限用户不能打开他人看板

- **WHEN** 不属于该`Run`团队的非管理员请求看板反代
- **THEN** 接口拒绝，集群中不因该请求新建`serve Pod`

### Requirement: 读盘失败不得破坏训练任务与列表

`logdir`不存在、文件无法解析、tag 对不上或`kind`无`NFS`时，系统 MUST 将对应快照字段留空，写入中文`metrics_error`，页面显示`—`。MUST NOT 因此把关联训练任务标记为失败，MUST NOT 回滚已提交的`Volcano Job`。

#### Scenario: 空目录时外层为破折号

- **WHEN** `metrics Job`读到不存在的`logdir`或没有任何 scalar tag
- **THEN** `Run`列表该行`Loss`为`—`，任务仍保持原状态

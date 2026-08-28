## MODIFIED Requirements

### Requirement: 队列列表展示额度与 Volcano 状态

列表 MUST 支持按关键词、数据中心、卡型号筛选并分页。每行 MUST 展示关联团队（批量投影）、数据中心、卡型号、`GPU`/`CPU`/`内存`已用与额度、功能特性、状态。已用 MUST 优先取自`Volcano Queue.status.allocated`。启用对应`Open`，禁用对应`Closed`。禁用或与`Volcano Queue`同步异常的队列 MUST NOT 被训练中心新建任务选为可提交目标。业务队列存在但集群中没有同名`Queue`时，MUST 用中文标明同步异常，并提供「重新同步」按库中元数据写回`CR`。

#### Scenario: 禁用队列不能提交训练任务

- **WHEN** 运维将队列禁用后，训练用户在新建任务中选择该队列并提交
- **THEN** 提交被拒绝，集群中不新增`Volcano Job`

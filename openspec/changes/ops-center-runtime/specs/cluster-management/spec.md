## ADDED Requirements

### Requirement: 运维可用 Kubeconfig 接入集群

系统 MUST 允许拥有运维中心菜单的会话接入`Kubernetes`集群。创建 MUST 提交显示名称与完整`Kubeconfig`；说明可选。接入时 MUST 用该凭证探测`API Server`，成功后保存版本、`API Server`地址、状态为健康；失败 MUST 返回业务错误且不得落库。`Kubeconfig`明文 MUST NOT 出现在任何`GET`响应或日志中。

#### Scenario: 接入 kind 集群成功

- **WHEN** 运维提交显示名称「训练集群」以及有效`Kubeconfig`
- **THEN** 列表出现该集群，状态为健康，并展示探测到的`Kubernetes`版本

#### Scenario: 无效凭证拒绝接入

- **WHEN** 运维提交无法访问的`Kubeconfig`
- **THEN** 接口返回业务错误，数据库不新增集群行

### Requirement: 集群列表展示用量 KPI

集群列表 MUST 分页返回显示名、状态、版本、关联数据中心（由节点标签聚合）、Ready/节点数、`GPU`/`CPU`/`内存`当前使用与总量。`GPU`/`CPU`/`内存` MUST 表示实际占用相对物理总量，而不是队列额度。页面 KPI MUST 包含接入数、健康数、Ready/节点合计、`GPU`总量。离线集群 MUST 仍出现在列表，用量可为 0。

#### Scenario: 空列表引导接入

- **WHEN** 尚未接入任何集群
- **THEN** 页面展示空态，并提供「接入集群」操作

### Requirement: 运维可编辑、探测和删除集群

编辑 MUST 允许改显示名与说明；`Kubeconfig`留空表示沿用，重新粘贴 MUST 覆盖并重新探测。连通测试 MUST 刷新版本与同步时间，失败则把状态标为离线。删除 MUST 二次确认；删除后断开连接，所属节点不再出现在节点管理。不得在响应中回传`Kubeconfig`。

#### Scenario: 连通测试失败标记离线

- **WHEN** 运维对不可达集群执行连通测试
- **THEN** 接口返回失败，该集群状态变为离线

#### Scenario: 删除后节点列表不再包含该集群节点

- **WHEN** 运维删除某接入集群
- **THEN** 节点管理按工作集群查询时无法再选择该集群，其节点不会出现在其他集群列表中

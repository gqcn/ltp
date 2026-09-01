## MODIFIED Requirements

### Requirement: 运维可整节点隔离与入池

隔离 MUST 将节点`cordon`并添加故障污点`maip.io/fault=true:NoSchedule`。入池 MUST `uncordon`并移除该故障污点与对应标签。操作 MUST 二次确认，可选备注，并写入维护记录。维护记录页 MUST 按时间倒序列出隔离、入池、数据中心、标签、污点动作。操作列与结果列 MUST 使用徽章，不得纯文本。节点详情 Conditions MUST 展示标准 kubelet 条件的`Type=True/False`（`Ready`、`MemoryPressure`、`DiskPressure`、`PIDPressure`、`NetworkUnavailable`）。

打开隔离确认框时，系统 MUST 校验这些节点若变为不可调度，相关数据中心的可调度容量相对已划分队列额度是否下降。会下降时，确认框 MUST 明显展示变化前后总量与已划分额度；隔离后总量低于已划分额度时，MUST 用更醒目的超额提示。用户确认后 MUST 仍执行隔离，MUST NOT 因额度超额拒绝隔离。节点当前不计入额度（未分配数据中心、已隔离或已禁止调度）时，MUST NOT 展示额度变化提示。

#### Scenario: 隔离后节点不可调度

- **WHEN** 运维隔离节点并填写备注
- **THEN** 节点状态变为 SchedulingDisabled，维护记录动作为`isolate`，节点列表「隔离信息」展示该备注

#### Scenario: 入池恢复调度

- **WHEN** 运维对已隔离节点执行入池
- **THEN** 节点恢复可调度，故障污点被移除，维护记录动作为`recover`

#### Scenario: 隔离确认框提示额度将下降

- **WHEN** 某数据中心可调度`NVIDIA-H200`总量 16 卡、队列已划分 8 卡，运维隔离一台贡献 8 卡的可调度节点
- **THEN** 隔离确认框展示该数据中心该型号可调度总量将从 16 卡变为 8 卡，并写明队列已划分 8 卡

#### Scenario: 隔离后将超额时确认框醒目提示

- **WHEN** 某数据中心可调度`NVIDIA-H200`总量 16 卡、队列已划分 16 卡，运维隔离一台贡献 8 卡的可调度节点
- **THEN** 确认框用危险样式提示隔离后可调度容量低于已划分额度，运维仍可确认隔离

#### Scenario: 不计入额度的节点隔离时不提示额度

- **WHEN** 运维隔离一台未分配数据中心，或已经隔离/禁止调度的节点
- **THEN** 确认框不出现额度变化提示

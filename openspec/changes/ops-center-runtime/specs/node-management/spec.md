## ADDED Requirements

### Requirement: 节点列表来自工作集群的 Kubernetes 节点

节点管理 MUST 按工作集群从`Kubernetes`实时列出节点，不得用业务表镜像节点库存。列表 MUST 支持按名称/IP 搜索、数据中心（含未分配）、状态（Ready / NotReady / SchedulingDisabled）、卡型号筛选，并在服务端分页。列表行 MUST 投影数据中心、可调度状态、隔离信息（含该节点最近一次成功隔离备注）、`GPU`/`CPU`/`内存`与标签摘要。状态列 MUST 展示`Ready`/`NotReady`，不可调度时追加`SchedulingDisabled`。宽表 MUST 在列表卡片内横向滚动，默认视口下`状态`、`Pods`、`隔离信息`列不得被右侧固定操作列完全挡住。装配 MUST 对当前集群一次列出节点与 Pod，禁止按节点循环调用 API；隔离备注 MUST 按当前页节点批量查询维护记录，禁止按节点循环查库。

#### Scenario: 节点列表可见状态与隔离列

- **WHEN** 运维在桌面宽度打开节点管理
- **THEN** 表头可见`状态`、`Pods`、`隔离信息`，行内状态徽章可见

#### Scenario: 未分配数据中心可筛选

- **WHEN** 工作集群存在未打`maip.io/datacenter`标签的节点，运维筛选「未分配」
- **THEN** 列表只返回这些节点

### Requirement: 运维可分配数据中心并维护标签污点

运维 MUST 能把启用中的数据中心标识写入节点标签`maip.io/datacenter`，也 MUST 能清除该标签使节点回到未分配。批量分配与单节点分配 MUST 写入维护记录。标签与污点编辑 MUST 应用到`Kubernetes`节点对象，并记录操作者与备注。

标签与污点表单 MUST 按`Kubernetes`语法校验后再提交：`key`为 qualified name（可选 DNS-1123 子域前缀最长 253，名称最长 63，字母或数字开头和结尾，中间可含`-`、`_`、`.`）；`value`为空或同样的名称规则，最长 63；污点`effect`仅允许`NoSchedule`、`PreferNoSchedule`、`NoExecute`。前端 MUST 在添加与保存时用中文错误写在对应输入域旁，并聚焦首个无效域。带前缀的合法`key`不得被默认单行 64 上限截断。

#### Scenario: 非法标签 key 被拦截

- **WHEN** 运维在标签管理中输入`key`为`-bad`并点击添加
- **THEN** 输入域旁展示中文错误，标签不写入列表

#### Scenario: 非法污点 value 被拦截

- **WHEN** 运维输入合法污点`key`、非法`value`（如`-bad`）并点击添加
- **THEN** 输入域旁展示中文错误，污点不写入列表

#### Scenario: 带前缀的合法标签可添加

- **WHEN** 运维添加`key`为`this.is.a.very.long.dns.subdomain.example.com/gpu-scheduling-pool-name-for-e2e`、`value`为`ok`
- **THEN** 该标签出现在编辑列表中，且不被长度上限截断

#### Scenario: 给未分配节点设置数据中心

- **WHEN** 运维将节点`kind-control-plane`的数据中心设为已启用的`cq-lj`
- **THEN** 该节点带有标签`maip.io/datacenter=cq-lj`，维护记录出现一条`set-dc`成功记录

### Requirement: 运维可整节点隔离与入池

隔离 MUST 将节点`cordon`并添加故障污点`maip.io/fault=true:NoSchedule`。入池 MUST `uncordon`并移除该故障污点与对应标签。操作 MUST 二次确认，可选备注，并写入维护记录。维护记录页 MUST 按时间倒序列出隔离、入池、数据中心、标签、污点动作。操作列与结果列 MUST 使用徽章，不得纯文本。节点详情 Conditions MUST 展示标准 kubelet 条件的`Type=True/False`（`Ready`、`MemoryPressure`、`DiskPressure`、`PIDPressure`、`NetworkUnavailable`）。

#### Scenario: 隔离后节点不可调度

- **WHEN** 运维隔离节点并填写备注
- **THEN** 节点状态变为 SchedulingDisabled，维护记录动作为`isolate`，节点列表「隔离信息」展示该备注

#### Scenario: 入池恢复调度

- **WHEN** 运维对已隔离节点执行入池
- **THEN** 节点恢复可调度，故障污点被移除，维护记录动作为`recover`

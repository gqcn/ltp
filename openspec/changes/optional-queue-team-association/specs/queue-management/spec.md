## MODIFIED Requirements

### Requirement: 创建队列时同步创建 Volcano Queue

拥有运维中心菜单的会话 MUST 能在指定工作集群创建资源队列。必填：队列标识、显示名称、数据中心、卡型号、`GPU`额度。关联团队、`CPU`/`内存`额度、功能特性（如`ib`）、说明可选。卡型号候选项 MUST 来自该数据中心节点的`maip.io/gpu-type`或`nvidia.com/gpu.product`，MUST NOT 把无卡型号标签的节点（例如控制面）展示为`cpu`型号。队列标识 MUST 符合`Volcano Queue`对象名规则：Kubernetes DNS-1123 子域（小写字母、数字、连字符与点，最长 63），且 MUST NOT 为`root`或`default`；创建后不可改。前端 MUST 在提交时用中文错误写在输入域旁并聚焦。`Volcano Job`对象名与`spec.tasks[].name` MUST 分别符合 DNS-1123 子域（兼`IsQualifiedName`，最长 63）与 DNS-1123 label；训练中心未启用时由创建 Job 的服务层拦截。创建成功 MUST 在目标集群存在同名`scheduling.volcano.sh/v1beta1 Queue`，其`capability`包含`cpu`、`memory`与`nvidia.com/gpu`。`GPU`/`CPU`/内存额度 MUST NOT 超过该数据中心剩余容量（可调度且未隔离节点的物理总量减去其他队列已声明额度）；已`cordon`（禁止调度）或已隔离（故障禁用）的节点 MUST NOT 计入总量。超额 MUST 拒绝创建或更新且不写`Volcano`。`Volcano`写入失败 MUST 回滚，不得留下仅有业务行的队列。

#### Scenario: 超额拒绝创建

- **WHEN** 数据中心该卡型号剩余 8 卡，运维提交`GPU`额度 9
- **THEN** 接口返回业务错误，数据库与集群均不新增队列

#### Scenario: 无 GPU 标签的节点不出现在卡型号下拉

- **WHEN** 数据中心内既有带`NVIDIA-H200`标签的工作节点，也有无卡型号标签的控制面
- **THEN** 新建/编辑队列的 GPU 型号下拉包含`NVIDIA-H200`，不包含`cpu`

#### Scenario: 创建队列后集群中可见 CR

- **WHEN** 运维在已接入的`kind`集群创建队列`lab-default`，`GPU`额度 8，`CPU` 32，内存 64Gi，并关联一个团队
- **THEN** 业务列表出现该队列，且`kubectl get queue lab-default`显示对应对象，`capability`含声明额度

#### Scenario: 非法队列标识被拦截

- **WHEN** 运维在新建队列中填写标识`Lab_GPU`并提交
- **THEN** 输入域旁展示中文错误，不创建业务队列与`Volcano Queue`

#### Scenario: 带点的合法队列标识可通过格式校验

- **WHEN** 运维填写标识`lab.gpu`并提交（其它必填项仍空）
- **THEN** 不出现队列标识格式错误

#### Scenario: 标识冲突拒绝创建

- **WHEN** 同一集群已存在同名队列标识
- **THEN** 接口返回业务错误，不修改已有`Volcano Queue`

#### Scenario: 额度预览不计入禁止调度节点

- **WHEN** 数据中心有两台各 8 卡的可调度`NVIDIA-H200`节点，其中一台已被`cordon`
- **THEN** 额度预览该型号总量为 8 卡，而不是 16 卡

#### Scenario: 额度预览不计入已隔离节点

- **WHEN** 数据中心有两台各 8 卡的`NVIDIA-H200`节点，其中一台已隔离
- **THEN** 额度预览该型号总量为 8 卡，而不是 16 卡

#### Scenario: 不关联团队可创建队列

- **WHEN** 运维填写必填项后不选择任何团队并提交新建队列
- **THEN** 创建成功，列表该行关联团队显示为空占位，不出现「请至少关联一个团队」

#### Scenario: 编辑队列可解绑全部团队

- **WHEN** 运维编辑已绑定团队的队列，清空关联团队并保存
- **THEN** 更新成功，该队列不再绑定任何团队，团队详情对应队列消失

## ADDED Requirements

### Requirement: 关联团队为选填且与团队页语义一致

创建与更新队列时，`teamIds` MUST 允许省略或空数组。空值 MUST 表示暂不绑定团队；更新时提交空列表 MUST 解除该队列全部团队绑定。前端关联团队字段 MUST NOT 标记为必填。若传入团队 ID，MUST 全部存在，且单次最多 100 个；不存在 MUST 拒绝且不部分写入。未绑定团队的队列 MUST 仍出现在运维队列管理列表中。

#### Scenario: 空列表与省略字段等价

- **WHEN** 创建队列时`teamIds`省略，或显式传入空数组
- **THEN** 队列落库且无团队绑定行，详情`teams`为空数组

#### Scenario: 不存在的团队 ID 被拒绝

- **WHEN** 运维提交包含不存在团队 ID 的`teamIds`
- **THEN** 接口返回业务错误，不创建或更新队列

## ADDED Requirements

### Requirement: 本地可用 Make 拉起 kind 与 Volcano

仓库 MUST 提供`make kind.up`创建名为`ltp`的`kind`集群，节点镜像为`Kubernetes 1.27`系列，并用`Helm`安装`Volcano 1.13`到`volcano-system`。`make kind.down` MUST 删除该集群。文档 MUST 说明如何导出`Kubeconfig`并在集群管理中接入，以及如何核对`kubectl get queue`。

#### Scenario: kind.up 后 Volcano 就绪

- **WHEN** 开发者在已安装`kind`、`kubectl`、`Helm`的机器执行`make kind.up`
- **THEN** `kubectl --context kind-ltp get ns volcano-system`成功，且`Queue` CRD 已注册

### Requirement: kind 工作节点模拟 GPU 容量

`make kind.up`创建的`ltp`集群 MUST 包含模拟`GPU`的工作节点，而不是只有无扩展资源的控制面。节点 MUST 带有`maip.io/gpu-type`（或`nvidia.com/gpu.product`）与`nvidia.com/gpu.count`，`status.allocatable` MUST 包含`nvidia.com/gpu`。因`kubelet`会覆盖未知扩展资源，仓库 MUST 在集群内持续写回该容量，保证控制台节点用量与队列额度预览在集群存活期间可见。本模拟 MUST NOT 依赖真实`GPU`硬件。

#### Scenario: kind.up 后节点带有可分配 GPU

- **WHEN** 开发者在空环境或重建后执行`make kind.up`
- **THEN** 集群中存在分别标记为`NVIDIA-H200`、`NVIDIA-H800`、`NVIDIA-GeForce-RTX-4090`的工作节点，且这些节点的`allocatable['nvidia.com/gpu']`大于 0

### Requirement: FastX 对接说明随功能一并交付

仓库 MUST 提供中文对接说明：Webhook 方法与路径、可选令牌头、成功/失败响应、字段映射，以及用户给出的 JSON 示例。本地默认 URL MUST 为`http://127.0.0.1:8000/api/webhooks/fastx/alerts`。

#### Scenario: 按文档 curl 可入库

- **WHEN** 开发者按说明文档对本地 Webhook 发送示例 JSON
- **THEN** HTTP 成功，告警中心能看到对应记录

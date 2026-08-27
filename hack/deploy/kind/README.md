# 本地 kind 实验集群

`make kind.up`创建名为`ltp`的`Kubernetes 1.27`集群，安装`Volcano 1.13`，并按[使用 Kubernetes Kind 模拟 AI 算力测试集群](https://johng.cn/cloud-native/kubernettes-kind-mock-ai-test-cluster)模拟`GPU`工作节点。本机不需要真实显卡。

## 拓扑

| 节点 | 角色 | 模拟资源 |
| --- | --- | --- |
| 控制面 | `control-plane` | 无`GPU`，不打数据中心标签 |
| `gpu-node-h200` | worker | 8 × `NVIDIA-H200` |
| `gpu-node-h800` | worker | 8 × `NVIDIA-H800` |
| `gpu-node-4090` | worker | 8 × `NVIDIA-GeForce-RTX-4090` |

工作节点标签包括`maip.io/gpu-type`、`nvidia.com/gpu.product`、`nvidia.com/gpu.count`，以及`maip.io/datacenter=cq-lj`（对齐`make db.mock`后的重庆两江）。`nvidia.com/gpu`写入节点`status.capacity`/`allocatable`。`kubelet`会覆盖未知扩展资源，控制面容器里的`ltp-mock-gpu-keeper`按标签持续写回。

## 命令

```bash
make kind.up
make kind.down
```

接入控制台：执行`kind get kubeconfig --name ltp`，在「集群管理」粘贴完整`Kubeconfig`。核对：

```bash
kubectl --context kind-ltp get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu,TYPE:.metadata.labels.nvidia\.com/gpu\.product
kubectl --context kind-ltp get queue
```

旧的单控制面`ltp`集群无法在线加入 worker。请先`make kind.down`再`make kind.up`。

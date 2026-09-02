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

`make kind.up`会构建并加载`ltp/experiment-agent:dev`，供实验分析读盘、演示训练与`TensorBoard`看板使用。三个工作节点通过`extraMounts`共享宿主机`/tmp/ltp-kind/hpc-home`与`/tmp/ltp-kind/share`，模拟机房网络盘。训练任务会把`/data/hpc/home`挂进容器；在新建任务页点「填入本地演示训练」后提交，任务会向`TENSORBOARD_LOGDIR`写入`tfevents`。对账读盘成功后，实验分析的 Loss、进度、吞吐列显示真实标量，详情可打开`TensorBoard`。

若当前`kind`集群是在增加`extraMounts`之前创建的，需要`make kind.down && make kind.up`后共享盘才生效。仅重新加载镜像可执行`make kind.up`（集群已存在时会跳过创建并重新`kind load`代理镜像）。

旧的单控制面`ltp`集群无法在线加入 worker。请先`make kind.down`再`make kind.up`。

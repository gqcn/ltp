## Why

数据中心与平台中心已经可验收，但运维中心仍缺集群、节点、队列和告警。训练任务尚未上线，运维仍需要先把真实`Kubernetes`接入、把资源队列落到`Volcano`，并接上企业内部`FastX`告警。本迭代对齐`prototype.v4`上述四个页面，刻意不实现集群概览。

## What Changes

- 集群管理：用`Kubeconfig`接入对等训练集群，连通后识别`API Server`与`Kubernetes`版本，展示节点与`CPU`/`内存`/`GPU`用量，支持编辑、连通测试、删除。
- 节点管理：从当前工作集群实时读取节点；支持数据中心标签、标签/污点、整节点隔离（`cordon`+故障污点）与入池，并落维护记录。
- 队列管理：业务队列落库，创建/更新/启停/删除时同步`Volcano Queue`；调度与资源分配由`Volcano`负责；队列绑定数据中心、卡型号、团队与`CPU`/`内存`/`GPU`额度。
- 告警中心：提供`FastX`Webhook 接入、列表筛选、详情、处理与批量处理；完成后给出对接地址与说明文档。
- 本地用`kind`搭建`Kubernetes 1.27`测试集群，用`Helm`安装`Volcano 1.13`；工作节点按[Kind 模拟 AI 算力集群](https://johng.cn/cloud-native/kubernettes-kind-mock-ai-test-cluster)写入`GFD`标签与`nvidia.com/gpu`扩展资源，便于节点/队列页验收`GPU`而不是只看到`CPU`节点。
- 数据中心关联计数改为真实节点/队列/集群统计；团队详情在队列模块启用后展示关联队列。
- 壳层开放运维中心：集群管理、节点管理、队列管理、告警中心；**不**开放集群概览与训练中心。

## Capabilities

### New Capabilities

- `cluster-management`：`Kubeconfig`接入、列表 KPI、详情、连通测试、编辑与删除；工作集群选择。
- `node-management`：按工作集群列出节点，分配数据中心，维护标签/污点，隔离/入池，维护记录。
- `queue-management`：业务队列 CRUD、团队关联、额度与功能特性；同步创建/更新/关闭/删除`Volcano Queue`。
- `alert-center`：`FastX`Webhook 入库、告警列表/详情/处理，以及对接说明。
- `kind-volcano-lab`：本地`kind 1.27`+`Volcano 1.13`实验环境与 Make 入口；模拟`H200`/`H800`/`RTX 4090`工作节点。

### Modified Capabilities

- `ops-console-shell`：运维中心侧栏增加集群管理、节点管理、队列管理、告警中心；集群概览与训练中心仍隐藏。
- `datacenter-management`：关联节点/队列/集群计数改为真实值；存在关联时禁止删除；去掉启停按钮与接口。
- `platform-teams`：团队详情展示已关联队列；队列模块启用后不再隐藏该入口。

## Impact

- 后端：新增集群/队列/维护记录/告警表；`Kubernetes`与`Volcano`客户端抽象；集群/节点/队列/告警 API；Webhook 公开入口；数据中心`UsageCounter`接真实统计。
- 前端：侧栏、工作集群选择、四个运维页面；团队详情队列区；视觉继续对齐`prototype.v4`。
- 本地依赖：本机`PostgreSQL`与模拟`LDAP`不变；新增 Docker/`kind`/`Helm`测试集群。
- 测试：kube/队列/告警替身单元测试；运维页面 E2E（列表、接入、队列、Webhook 入库）；表单空提交中文校验与聚焦。
- `i18n`：不引入语言包，运行时文案用中文。
- 数据权限：本迭代运维资源对拥有运维中心菜单的会话全局可见，不引入行级数据权限。
- 字典模块：本迭代不引入；状态/动作/级别用 Go 命名类型。
- 规则文件`.agents/rules/frontend-ui.md`、`.agents/rules/i18n.md`、`.agents/rules/data-permission.md`仍缺失，以前端原型、中文文案和「无行级数据权限」作为可验收来源。

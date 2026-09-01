## Why

列表页数据中心列目前经常展示英文标识（如`cq-lj`、`jdc-105329`），用户无法快速辨认机房。训练中心算法工程师也没有数据中心管理权限，不能靠前端再查一遍数据中心列表来补名称。

## What Changes

- 任务列表、任务详情、我的队列、队列管理、节点管理、团队已关联队列等列表展示数据中心**简称**，不再把全称或标识当作主文案。
- 列表接口批量投影`datacenterName`（及角标所需的简称、颜色），禁止按行补查。
- 标识仍返回，悬停可看；缺失登记时才回退到标识。

## Capabilities

### New Capabilities

- `list-datacenter-display`：各列表数据中心列展示名称而非英文标识

### Modified Capabilities

- `training-jobs`：任务列表与详情数据中心列使用显示名称
- `training-my-queues`：我的队列数据中心列使用显示名称
- `queue-management`：队列列表数据中心列使用显示名称
- `node-management`：节点列表数据中心列使用显示名称
- `platform-teams`：团队已关联队列数据中心列使用显示名称

## Impact

- 后端：`datacenter`增加按标识批量取名称；`trainjob`、`queue`、`node`、`team`列表投影增加名称字段
- API：任务、我的队列、队列、节点、团队队列响应增加`datacenterName`等展示字段，不删`datacenterCode`
- 前端：`DcBadge`优先显示名称；训练页不再依赖运维数据中心列表接口
- 测试：单元覆盖批量投影；E2E 断言列表徽章为中文名称而非标识

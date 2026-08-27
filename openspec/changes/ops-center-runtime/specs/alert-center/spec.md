## ADDED Requirements

### Requirement: FastX 可通过 Webhook 写入告警

系统 MUST 提供无需登录会话的`POST /api/webhooks/fastx/alerts`。请求体 MUST 接受`FastX`示例结构：`originalBody`（`faultName`、`faultEnv`、`cluster`、`handlingStrategy`）与`alarmInfo`（`name`、`level`、`alarmCount`、`alarmData`、`firstAlarmTime`、`createUser`）。配置了 Webhook 令牌时，请求 MUST 携带匹配的`X-FastX-Token`或`token`查询参数，否则拒绝。成功 MUST 将告警以`open`状态入库，并保存完整原始 JSON。解析规则：标题取`alarmInfo.name`；故障信息取`originalBody.faultName`；级别`1=info`、`2=warning`、`>=3=critical`；节点从`alarmData`标签的`Hostname`或`instance`去重提取。

#### Scenario: 推送示例 JSON 后列表可见

- **WHEN** 调用方对 Webhook 地址提交文档中的示例 JSON
- **THEN** 告警中心出现一条待处理告警，标题为`alarmInfo.name`，并可查看原始载荷

#### Scenario: 令牌不匹配被拒绝

- **WHEN** 配置了 Webhook 令牌但请求未携带或携带错误令牌
- **THEN** 接口拒绝写入，告警列表不增加记录

### Requirement: 运维可筛选、查看和处理告警

告警中心 MUST 按级别、处理状态、时间范围和关键词筛选并分页。列表项 MUST 展示标题、告警信息、可选故障信息、来源、节点、时间与处理状态。详情 MUST 展示解析字段与原始 JSON。运维可将状态改为跟进中或已完成并填写备注；支持批量处理。有故障信息且能解析单一节点名时，MUST 提供跳转节点管理的入口。训练中心未启用时 MUST 隐藏「查看任务」。侧栏告警角标 MUST 显示未完成（待处理+跟进中）数量。

#### Scenario: 处理告警写入备注

- **WHEN** 运维将一条待处理告警标记为已完成并填写备注
- **THEN** 列表状态变为已完成，详情可见备注、处理人与处理时间

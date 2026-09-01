## MODIFIED Requirements

### Requirement: 队列列表投影数据中心名称

队列列表响应 MUST 提供`datacenterShortName`。简称 MUST 在当前页投影时批量装配。列表列 MUST 展示简称。

#### Scenario: 运维队列列表展示名称

- **WHEN** 管理员打开队列管理
- **THEN** 数据中心列展示简称而不是全称或标识

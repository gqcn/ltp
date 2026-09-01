## MODIFIED Requirements

### Requirement: 节点列表投影数据中心名称

节点列表当前页 MUST 投影`datacenterShortName`。未分配数据中心的节点 MUST 继续展示未分配，不得填简称。

#### Scenario: 已标记节点展示名称

- **WHEN** 节点标签`maip.io/datacenter`对应已登记数据中心
- **THEN** 节点列表该列展示简称

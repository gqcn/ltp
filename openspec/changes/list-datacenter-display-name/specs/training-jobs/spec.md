## MODIFIED Requirements

### Requirement: 任务列表与详情投影数据中心名称

训练任务列表与详情响应 MUST 在`datacenterCode`之外提供`datacenterName`。名称 MUST 按当前页标识批量查询登记表，禁止按任务循环查询。前端徽章 MUST 使用`datacenterShortName`作为主文案，无简称时再回退名称。

#### Scenario: 列表接口带名称

- **WHEN** 客户端请求训练任务列表
- **THEN** 每条任务包含`datacenterCode`与对应的`datacenterName`（已登记时）

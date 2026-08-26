## REMOVED Requirements

### Requirement: 系统始终存在一个默认数据中心

**Reason**：未配置数据中心的节点应保持未分配，不应回落到内置默认中心。

**Migration**：执行`003-remove-default-datacenter.sql`软删除标识`default`且`is_default`为真的行。控制台不再展示默认中心 KPI 与保护按钮。

## MODIFIED Requirements

### Requirement: 管理员可以分页检索数据中心

系统 MUST 提供数据中心列表接口，支持按关键字（标识、名称、简称、区域、描述）模糊搜索、按启用状态过滤、分页与稳定排序。过滤、排序和分页 MUST 在数据库侧完成。每条列表记录 MUST 包含标识、名称、简称、区域、`Label`、启用状态、颜色、描述、关联计数与创建/更新时间（Unix 毫秒）。列表 KPI MUST 只汇总总数、已启用、已停用，MUST NOT 返回默认中心简称。本迭代关联计数 MUST 返回节点、队列、集群均为`0`，且不得对未实现模块发起逐条查询。初始化后 MUST NOT 再出现标识为`default`的内置默认数据中心。

#### Scenario: 按关键字与状态过滤

- **WHEN** 管理员搜索「两江」并筛选「启用」
- **THEN** 系统只返回名称、简称、标识、区域或描述匹配且已启用的当前页记录与总数

#### Scenario: 空结果

- **WHEN** 关键字无法匹配任何数据中心
- **THEN** 系统返回空列表与总数`0`，不得报错

#### Scenario: 初始化后没有内置默认数据中心

- **WHEN** 数据库完成初始化（含`003`）并打开数据中心列表
- **THEN** 列表中不存在名称「默认数据中心」的内置记录，KPI 不展示默认数据中心

### Requirement: 管理员可以创建数据中心

创建时 MUST 填写标识、显示名称、简称；区域、颜色、描述可选。标识 MUST 匹配`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`，创建后不可修改。`Label` Key 固定为`maip.io/datacenter`，完整`Label`为`maip.io/datacenter=<标识>`。新记录默认启用。标识冲突 MUST 被拒绝。标识`default` MUST 可作为普通标识创建，无系统保留语义。

#### Scenario: 创建有效数据中心

- **WHEN** 管理员提交标识`cq-lj`、名称「重庆两江」、简称「两江」
- **THEN** 系统创建该记录，返回其主键，且`Label`为`maip.io/datacenter=cq-lj`

#### Scenario: 非法标识被拒绝

- **WHEN** 管理员提交标识`CQ_LJ`或`-lj`
- **THEN** 系统拒绝创建，不写入记录

#### Scenario: 重复标识被拒绝

- **WHEN** 已存在标识`cq-lj`时再次创建相同标识
- **THEN** 系统拒绝创建

### Requirement: 管理员可以编辑数据中心元数据

编辑 MUST 允许修改名称、简称、区域、颜色、描述，不得修改标识与`Label` Key。

#### Scenario: 更新显示名称

- **WHEN** 管理员将某数据中心名称改为「重庆两江新区」
- **THEN** 系统保存新名称，标识保持不变

### Requirement: 管理员可以启用或停用数据中心

停用后该数据中心不得出现在「启用」筛选中，但记录仍可被查询和再次启用。任意数据中心 MUST 允许停用，包括标识恰好为`default`的普通记录。

#### Scenario: 停用后再启用

- **WHEN** 管理员停用某数据中心，随后再次启用
- **THEN** 该记录状态先变为停用，再恢复为启用，数据仍然存在

### Requirement: 管理员可以删除数据中心

删除 MUST 使用软删除。若存在关联节点、队列或集群，系统 MUST 拒绝删除，MUST NOT 改挂到任何默认数据中心。本迭代无此类关联时直接软删除。已删除记录不得出现在默认列表中，其标识可被重新创建。任意数据中心 MUST 允许删除。

#### Scenario: 删除无关联的数据中心

- **WHEN** 管理员删除一个无关联的数据中心
- **THEN** 列表不再展示该记录

## ADDED Requirements

### Requirement: 未配置数据中心的节点保持未分配

节点没有`maip.io/datacenter`标签时 MUST 视为未分配，MUST NOT 回落到内置或隐式默认数据中心。控制台文案 MUST 说明未配置即为空。

#### Scenario: 节点未打数据中心标签

- **WHEN** 节点未设置`maip.io/datacenter`
- **THEN** 该节点的数据中心归属为空，而不是`default`或「默认数据中心」

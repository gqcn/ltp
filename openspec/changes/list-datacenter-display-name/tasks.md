## 1. 后端投影

- [x] 1.1 `datacenter.Service`增加`MapByCodes`，一次`IN`查询返回名称投影
- [x] 1.2 队列`projectItems`批量写入`DatacenterName`/`ShortName`/`Color`；团队队列与绑定候选项一并带出
- [x] 1.3 训练任务`List`/`Get`批量写入名称字段；我的队列从队列投影拷贝
- [x] 1.4 节点列表当前页批量写入名称字段
- [x] 1.5 API DTO：任务、我的队列、队列、节点、团队队列增加`datacenterName`等字段

## 2. 前端

- [x] 2.1 `DcBadge`主文案改为简称优先，`title`保留全称与标识
- [x] 2.2 任务列表、任务详情、我的队列、队列、节点、团队页使用接口名称字段

## 4. 反馈

- [x] 4.1 列表数据中心列改回展示简称，不以全称作为主文案

## 3. 验证

- [x] 3.1 单元测试：`MapByCodes`与队列/任务列表名称装配
- [x] 3.2 E2E：任务列表与详情徽章为名称而非`cq-lj`；更新既有断言
- [x] 3.3 `make lint`；浏览器核对各列表数据中心列

## 规则影响记录

- 命中`openspec.md`、`documentation.md`、`api-contract.md`、`architecture.md`、`backend-go.md`、`testing.md`。
- 无 SQL 变更，`database.md`无影响。
- `.agents/rules/frontend-ui.md`缺失。

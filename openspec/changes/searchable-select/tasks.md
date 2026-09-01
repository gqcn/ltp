## 1. 组件

- [x] 1.1 前端增加`react-select`依赖
- [x] 1.2 实现共享`Select`：可搜索、中文无匹配、菜单 portal、对齐现有下拉外观
- [x] 1.3 样式覆盖工具栏、表单、工作集群与分页三种密度，并跟随主题

## 2. 替换调用

- [x] 2.1 顶栏工作集群与`Pagination`每页条数改用`Select`
- [x] 2.2 用户、任务、配置、实验、队列、节点列表筛选改用`Select`
- [x] 2.3 表单内选择（队列/任务/配置/节点/LDAP 角色等）改用`Select`；`react-hook-form`改为`Controller`或`setValue`
- [x] 2.4 确认生产页面不再残留选择类原生`select`

## 3. 验证

- [x] 3.1 E2E 助手：打开、关键字过滤、点选`option`；替换既有`selectOption`
- [x] 3.2 E2E：用户管理团队筛选可输入关键字命中团队；无匹配时见「无匹配选项」
- [x] 3.3 浏览器走通工具栏、表单弹窗与工作集群；`make lint`（本次无 Go 变更则记录无影响）

## 4. 反馈

- [x] 4.1 截图审查列表页顶部筛选下拉：闭合态统一舒适宽度，默认文案不贴箭头；菜单随较长选项变宽，长团队名与`SchedulingDisabled`单行完整可见

## 规则影响记录

- 命中`openspec.md`、`documentation.md`、`testing.md`。
- 无 HTTP/Go/SQL 变更，`api-contract.md`、`architecture.md`、`backend-go.md`、`database.md`无影响。
- 无 i18n 语言包；空态写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，外观对齐现有`.filter-select`与表单`select`。

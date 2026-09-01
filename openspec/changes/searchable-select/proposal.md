## Why

控制台里的筛选和表单选择都是原生`select`，选项一多（团队、队列、卡型号、工作集群）只能靠滚动，无法按关键字定位。用户管理刚加上团队筛选后这个问题更明显。需要统一换成可搜索的下拉，并用成熟组件承载过滤、键盘和弹出层，而不是各页手写一套。

## What Changes

- 新增共享`Select`封装，底层使用`react-select`，默认可按选项文案关键字过滤。
- 工具栏筛选、表单选择、顶栏工作集群、分页「每页条数」等选择类下拉全部改为该组件；禁用的只读选择（例如由队列决定的卡型号）同样走该组件，仅不可交互。
- 无匹配时展示中文「无匹配选项」。弹出层挂到`document.body`，避免被弹窗裁切。
- 外观对齐现有`.filter-select`、表单`select`与工作集群选择器，跟随浅色/深色主题。
- 更新依赖原生`selectOption`的 E2E，改为对可搜索下拉的打开、过滤与点选。

## Capabilities

### New Capabilities

- `searchable-select`：控制台选择类下拉统一可搜索。

### Modified Capabilities

无。业务筛选与表单字段语义不变，只换交互控件。

## Impact

- 前端：新增`Select`组件；替换各页原生`select`；`apps/frontend`增加`react-select`依赖。
- 测试：E2E 选择助手与既有`selectOption`用例；覆盖关键字过滤与无匹配提示。
- 无 API、后端、数据库变更。
- 无 i18n 语言包；提示文案写中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，样式对齐现有下拉。
- 规则无影响判断：不改 HTTP 契约，`api-contract.md`无影响；不改模块边界与列表装配，`architecture.md`无影响；不改 Go 与 SQL，`backend-go.md`、`database.md`无影响。

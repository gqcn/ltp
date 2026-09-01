## 1. 前端

- [x] 1.1 去掉「从`LDAP`添加用户」弹窗顶部连接信息框，以及仅为该框发起的配置查询
- [x] 1.2 删除仅用于该框的`.ldap-add-cfg`样式

## 2. 验证

- [x] 2.1 `E2E`：打开添加弹窗不出现主机、端口、`Base DN`或测试状态，检索与勾选仍可用
- [x] 2.2 浏览器或`E2E`截图确认弹窗顶部不再有连接信息框

## 规则影响记录

- 命中`testing.md`、`openspec.md`、`documentation.md`。
- 不改模块边界、HTTP 契约、后端或 SQL；`architecture.md`、`api-contract.md`、`backend-go.md`、`database.md`无影响。
- `.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`缺失。

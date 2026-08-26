## Why

数据中心表单现在用浏览器原生`<input type="color">`，和 GitHub Issue 标签的选色方式差一截：点色块不会立刻换色，输入框也不会给出常用色。运维选角标色需要更快、更可预期的交互。

## What Changes

- 新建/编辑数据中心时，展示色改为 GitHub 标签式交互：
  - 点击颜色图标（色块上的刷新图标）立即切换到下一个常用色。
  - 点击颜色输入框弹出常用色板。
  - 仍可在输入框手填`#RRGGBB`。
- 保存契约不变，仍提交`#RRGGBB`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `datacenter-management`：创建/编辑数据中心时的展示色选择交互。

## Impact

- 仅前端：数据中心表单与样式；新增 E2E。
- 不改 API、数据库、后端校验。
- 无 i18n 语言包；新增中文`aria-label`（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，视觉对齐现有`prototype.css`与 GitHub 标签选色。

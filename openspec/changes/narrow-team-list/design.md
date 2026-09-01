## Context

团队页应对齐`prototype.v4`。原型截图（`1440×900`）量得列表约`755px`、详情约`377px`，间距`16px`，即`.grid-2-1`的`2fr 1fr`。曾把列表封顶`340px`并改成左窄右宽，和原型相反。

## Goals / Non-Goals

**Goals:**

- 分栏宽度与原型一致：左列表`2fr`，右详情`1fr`。
- 列表标题与搜索同一行；分页信息在左、翻页在右。

**Non-Goals:**

- 不改成邮件式窄主栏。
- 不改团队数据与详情交互。

## Decisions

1. **使用`.grid-2-1`，不自定像素上限**
   - 与原型同一套`2fr 1fr`。
   - 备选`minmax(260px, 340px) 1fr`已否：比原型窄一半，搜索和分页被挤乱。

2. **列表头与分页保持原型横排**
   - 搜索`max-width: 220px`，与标题同一行。
   - 分页不改成两行堆叠。

## 复杂度与性能

- 复用已有`.grid-2-1`，无新抽象。

## 规则影响

- 命中`testing.md`、`openspec.md`、`documentation.md`。
- `architecture.md`、`api-contract.md`、`backend-go.md`、`database.md`无影响。
- `.agents/rules/frontend-ui.md`缺失，宽度以`prototype.v4`为准。

## Risks / Trade-offs

- [大屏列表仍约占三分之二] → 与原型一致；超宽时两栏同比变宽。

## Migration Plan

只发前端。

## Open Questions

无。

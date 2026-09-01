## Why

团队列表宽度应跟`prototype.v4`走，不要另定像素上限。原型在`1440`宽下是左列表约`755px`、右详情约`377px`。

## What Changes

- 分栏使用`.grid-2-1`（`2fr 1fr`），与原型一致。
- 列表头标题与搜索同一行；分页横排。
- 去掉`340px`窄栏方案。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `platform-teams`：团队页左右栏宽度对齐`prototype.v4`。

## Impact

- 前端：仅团队管理分栏 class 与列表头/分页排版。
- 测试：`1440`宽下断言列表约为详情两倍，并截图对照原型。
- 无 API、后端、数据库变更。

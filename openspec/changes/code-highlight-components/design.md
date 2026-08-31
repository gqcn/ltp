## Context

控制台已经有一套代码区视觉（`--code-bg`、`--hl-*`、`.code-block`、`.code-editor`），但引擎没有跟上：

- 编写侧：配置集文件、启动命令、环境变量、集群`Kubeconfig`都是普通`textarea`。样式里留了`.code-editor-hl`叠加层，实际没有分词。
- 展示侧：任务详情用页面内正则给`Shell`/`ENV`/`YAML`上色；配置详情、节点`YAML`、告警`JSON`只加了语言角标，正文仍是纯文本。
- 任务详情`E2E`（`TC010`）绑定了自写 class（`.hl-cmd`、`.hl-key`）。

约束：`React 19` +`Vite` SPA，代码文件上限 50 KB，编辑框常嵌在表单和弹窗里，必须跟随`data-theme`深浅色。业务契约、`API`与存储不变。

复杂度判断：多处页面各自实现高亮会继续分叉。抽一层共享组件是为了收敛语法引擎、色板和表单接入，不是新业务模块，也不引入跨模块后端契约。

## Goals / Non-Goals

**Goals:**

- 源代码编写框在输入过程中即有语法高亮。
- 源代码只读展示框与编写框使用同一套分词与色板。
- 现有代码入口全部接入，外观仍对齐当前代码区（等宽字体、语言角标、深浅色变量）。
- 表单校验、弹窗首焦、`react-hook-form`取值不受影响。

**Non-Goals:**

- 不做协作编辑、LSP、YAML schema 校验、格式化、差异对比。
- 不改说明、备注、描述等自然语言`textarea`。
- 不改`Pod`进程日志渲染（结构化日志，不是源代码）。
- 不改后端存储、接口字段或 50 KB 文件上限。
- 不把代码组件抽成独立 npm 包或设计系统仓库。

## Decisions

1. **编辑与展示统一用`CodeMirror 6`，不用`Monaco`，也不拆成「编辑一套、展示一套」**

   | 方案 | 结论 |
   | --- | --- |
   | `CodeMirror 6` | 采用。模块化、适合表单/弹窗、包体明显小于`Monaco`，只读模式即可当展示框。 |
   | `Monaco Editor` | 不采用。偏 IDE，Web Worker 与弹窗布局成本高，对启动命令这类短字段过重。 |
   | 编辑`CodeMirror`+展示`Shiki`/`Prism` | 不采用。两套分词器色板难对齐，也重复依赖。 |
   | 继续自写正则 | 不采用。`YAML`/`JSON`/`Shell`覆盖差，正是本变更要去掉的实现。 |

   前端只依赖`@codemirror/view`、`@codemirror/state`、`@codemirror/language`、`@codemirror/commands`、`@codemirror/lang-yaml`、`@codemirror/lang-json`、`@codemirror/legacy-modes`（`Shell`与`properties`）。不引入`@uiw/react-codemirror`等二次封装。

2. **共享两个薄组件，底层一个编辑器实例工厂**

   - `CodeEditor`：可编辑。
   - `CodeViewer`：只读（`EditorState.readOnly` + 不可聚焦编辑，可选复制仍由页面已有按钮负责）。
   - 二者共用语言扩展、主题扩展与`data-code-surface` / `data-lang`测试钩子。
   - 不在每个页面直接`new EditorView`。调用方只传`value`、`language`、可选`onChange`/`id`/`placeholder`。

   ```mermaid
   flowchart LR
     pages[配置 / 任务 / 集群 / 节点 / 告警页面]
     pages --> editor[CodeEditor]
     pages --> viewer[CodeViewer]
     editor --> factory[CodeMirror 实例工厂]
     viewer --> factory
     factory --> langs[YAML JSON Shell Env]
     factory --> theme[HighlightStyle 映射 --hl-*]
   ```

3. **语言映射跟现有字段语义，不新增用户可选语言**

   | 语言 | 使用处 |
   | --- | --- |
   | `yaml` | 配置文件`.yaml`/`.yml`、集群`Kubeconfig`、节点详情`YAML` |
   | `json` | 配置文件`.json`、告警原始`webhookPayload` |
   | `shell` | 新建任务启动命令、任务详情启动命令、`.sh`/`.bash` |
   | `env` | 新建任务环境变量、任务详情环境变量（`KEY=VALUE`，用`properties`模式） |
   | `text` | 其它扩展名，仍进代码组件但不启用语法树 |

   配置文件语言继续由已有`configFileLang`推导。空内容时由页面决定占位文案（例如「# 无启动命令」），组件只高亮传入文本。

4. **色板用 CSS 变量，不在主题切换时重建编辑器**

   `HighlightStyle`把 Lezer tag 映射到已有`--hl-key`、`--hl-str`、`--hl-num`、`--hl-bool`、`--hl-comment`、`--hl-cmd`、`--hl-var`等。`EditorView.theme`使用`--code-bg`、`--mono`、`--text-0`。`data-theme`切换时颜色自动跟随，不必`reconfigure`。

5. **按场景区分行号与折行，不做成通用 IDE**

   | 场景 | 行号 | 折行 |
   | --- | --- | --- |
   | 配置文件工作区、节点`YAML`、告警`JSON` | 开 | 关 |
   | 启动命令、环境变量、弹窗内`Kubeconfig` | 关 | 开 |

   高度沿用现有 CSS：表单字段有最小高度，配置文件编辑区`flex: 1`填满工作区。

6. **表单接入走受控值，弹窗与校验聚焦识别`contenteditable`**

   - `react-hook-form`用`Controller`（或等价`setValue`），不再`register`隐藏的`textarea`。
   - 组件把`id`、`aria-invalid`、`aria-label`写到`.cm-content`。
   - `Modal`首焦与`form.ts`错误聚焦选择器补上`.cm-content`，否则集群`Kubeconfig`和带校验的命令框会失焦。
   - 代码组件按路由动态`import`，避免登录页打进语法包。

7. **E2E 断言文本与`data-*`钩子，不绑定自写`.hl-*` class**

   现有`TC010`对`.hl-cmd`、`.hl-key`的断言改为：表面节点存在、正文含`torchrun`/`EPOCHS`，以及高亮 token 节点存在（`CodeMirror`的 token class）。新增覆盖配置文件编辑、集群`Kubeconfig`、告警`JSON`至少一处编写与一处展示。

## Risks / Trade-offs

- [弹窗里`CodeMirror`高度为 0] → `Kubeconfig`与节点/告警展示给定明确`min-height`，打开弹窗后再挂载或在可见时`requestMeasure`。
- [校验失败无法聚焦命令/`Kubeconfig`] → 同步改`Modal`与`form.ts`的可聚焦选择器。
- [Playwright 无法`fill`原来的`textarea`] → 对`.cm-content`使用`fill`或等价输入；保留`id`便于定位。
- [包体变大] → 只装需要的语言包，组件动态导入，不引入`Monaco`。
- [自写高亮与`CodeMirror` token 不完全同色] → 色板映射到现有`--hl-*`，允许 token 粒度比正则更细，不追求像素级复刻`.hl-flag`。

## Migration Plan

只发前端。无数据迁移。回滚即回退该前端变更。页面替换完成后删除`JobDetailPage`内`highlightShell`/`highlightEnv`/`highlightYaml`，以及已无引用的透明叠加`.code-editor-hl`规则。

## Open Questions

无。

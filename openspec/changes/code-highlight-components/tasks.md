## 1. 共享组件

- [x] 1.1 为前端添加`CodeMirror 6`核心与`YAML`/`JSON`/`Shell`/`properties`语言依赖
- [x] 1.2 实现`CodeEditor`与`CodeViewer`：共用语言/主题扩展，`data-code-surface`与`data-lang`，色板映射`--hl-*`
- [x] 1.3 按场景支持行号/折行/高度，并把组件做成路由级动态导入

## 2. 表单与焦点

- [x] 2.1 更新`Modal`首焦与`form.ts`错误聚焦选择器，使其能落到`.cm-content`
- [x] 2.2 编写入口用受控值接入（含`react-hook-form`的`Controller`），保留原有`id`与校验提示

## 3. 替换编写入口

- [x] 3.1 配置集文件编辑改为`CodeEditor`
- [x] 3.2 新建任务启动命令与环境变量改为`CodeEditor`
- [x] 3.3 集群`Kubeconfig`改为`CodeEditor`

## 4. 替换展示入口

- [x] 4.1 配置集详情文件查看改为`CodeViewer`
- [x] 4.2 任务详情启动命令、环境变量、挂载快照改为`CodeViewer`，删除页面内自写高亮函数
- [x] 4.3 节点详情`YAML`与告警原始`JSON`改为`CodeViewer`

## 5. 样式清理

- [x] 5.1 对齐现有代码区外观（语言角标、工作区高度、表单边框），删除已无引用的`.code-editor-hl`透明叠加规则

## 6. 验证

- [x] 6.1 更新`TC010`：不再断言`.hl-cmd`/`.hl-key`，改为断言展示表面、正文与高亮 token
- [x] 6.2 新增训练中心`E2E`：配置文件编辑表面与任务创建命令编辑表面
- [x] 6.3 新增运维中心`E2E`：集群`Kubeconfig`编辑表面与告警`JSON`展示表面
- [x] 6.4 浏览器走通深浅色：配置编辑、任务创建/详情、集群接入、节点`YAML`、告警详情

## 规则影响记录

- 无`API`/`SQL`/后端变更；架构模块启停、跨模块契约、接口性能无影响。
- 无`i18n`语言包；`aria`文案用中文（`.agents/rules/i18n.md`缺失）。
- `.agents/rules/frontend-ui.md`缺失，视觉对齐现有代码区样式与`--hl-*`变量。
- 测试规则命中：更新并新增`E2E`，截图写入`temp/`日期目录。

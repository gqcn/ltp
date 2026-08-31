## ADDED Requirements

### Requirement: 源代码编辑与展示走共享语法组件

控制台中所有源代码编写框与只读源代码展示框 MUST 使用共享组件，由同一套主流成熟语法引擎负责分词与着色。禁止业务页面自写正则或手写 token class 做高亮。禁止用无语法高亮的`textarea`或无语法高亮的`<pre>`承载源代码。共享组件根节点 MUST 提供`data-code-surface`（`editor`或`viewer`）与`data-lang`。

#### Scenario: 配置文件编辑框不是普通文本域

- **WHEN** 用户打开新建或编辑配置集并进入文件页签
- **THEN** 当前文件内容出现在`data-code-surface="editor"`中，页面上该文件内容不是无高亮`textarea`

#### Scenario: 任务详情命令展示不是自写高亮

- **WHEN** 用户打开含启动命令的任务详情「配置」页签
- **THEN** 启动命令出现在`data-code-surface="viewer"`中，且命令关键字与变量使用不同颜色，而不是页面内自写的`.hl-*`节点

### Requirement: 语言按字段语义或文件扩展名识别

共享组件 MUST 按字段语义或文件扩展名选择语言：`.yaml`/`.yml`与`Kubeconfig`、节点`YAML`为`yaml`；`.json`与告警原始载荷为`json`；启动命令与`.sh`/`.bash`为`shell`；`KEY=VALUE`环境变量为`env`；无法识别时为`text`但仍使用共享组件。`data-lang` MUST 与所选语言一致，现有语言角标 MUST 继续展示。

#### Scenario: YAML 配置文件带 yaml 语言

- **WHEN** 用户在配置编辑器打开`pretrain.yaml`
- **THEN** 编辑表面`data-lang`为`yaml`，并可见`YAML`角标

#### Scenario: 告警原始内容按 JSON 高亮

- **WHEN** 用户打开含`webhookPayload`的告警详情
- **THEN** 原始告警内容在展示表面中，`data-lang`为`json`，键与字符串颜色不同

### Requirement: 高亮跟随控制台深浅色主题

语法高亮色板 MUST 使用控制台已有代码色变量，并在`data-theme`为`dark`与`light`时保持可读。切换主题 MUST 立即更新已打开的编辑框与展示框颜色，不必刷新页面。

#### Scenario: 浅色主题下展示框仍然分色

- **WHEN** 用户在深色主题查看任务详情启动命令后切换到浅色主题
- **THEN** 展示框背景与 token 颜色切换为浅色代码色板，正文仍可读且仍有分色

### Requirement: 现有源代码编写入口必须接入编辑表面

以下编写入口 MUST 使用`data-code-surface="editor"`：配置集多文件内容、新建任务启动命令、新建任务环境变量、接入或编辑集群时的`Kubeconfig`。编辑过程中 MUST 保持语法高亮；提交或保存 MUST 仍提交用户输入的原始文本，不得改写缩进以外的业务字段。

#### Scenario: 启动命令输入过程中高亮

- **WHEN** 用户在新建任务填写启动命令`torchrun --nproc_per_node=$GPU_NUM train.py`
- **THEN** 编辑表面可见命令名、选项与变量的分色，保存后任务详情展示同一正文

#### Scenario: 粘贴 Kubeconfig 后仍按 YAML 高亮

- **WHEN** 管理员在接入集群弹窗粘贴合法`Kubeconfig YAML`
- **THEN** 该字段为编辑表面且`data-lang`为`yaml`，键与字符串分色，提交值与粘贴文本一致

### Requirement: 现有源代码展示入口必须接入展示表面

以下只读入口 MUST 使用`data-code-surface="viewer"`：配置集详情文件内容、任务详情启动命令、任务详情环境变量、任务详情配置挂载快照文件、节点详情`YAML`、告警详情原始`JSON`。展示框 MUST 只读，不得出现可提交的编辑控件。

#### Scenario: 配置详情只读查看带高亮

- **WHEN** 用户打开已发布配置集详情并选中一个`YAML`文件
- **THEN** 文件内容在`data-code-surface="viewer"`中高亮，不能在该表面直接改文件并保存

#### Scenario: 展开任务挂载快照可见高亮正文

- **WHEN** 用户在任务详情展开挂载配置文件
- **THEN** 快照正文出现在展示表面中，并能读到文件里的配置键值

### Requirement: 自然语言与进程日志不使用代码表面

说明、备注、描述等自然语言字段 MUST 继续使用普通文本控件。任务详情`Pod`进程日志 MUST 继续使用现有日志渲染，不得改成源代码语法组件。

#### Scenario: 告警处理备注仍是普通文本域

- **WHEN** 用户打开告警「处理」弹窗
- **THEN** 处理备注仍是普通`textarea`，没有`data-code-surface`

#### Scenario: Pod 日志仍按日志行渲染

- **WHEN** 用户在任务详情打开「Pod 列表」并查看容器日志
- **THEN** 日志仍在现有日志面板中按行展示级别与正文，而不是`data-code-surface`代码框

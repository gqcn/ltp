# OpenSpec 开发流程规则

## 适用范围

本规则约束`LinaPro`仓库的`SDD`开发流程、`OpenSpec`变更生命周期、反馈修复、审查、归档、任务记录、文档语言和验证门禁。

## 基础流程

本项目采用`SDD`驱动开发，使用`OpenSpec`工具辅助落地。变更记录存放在`openspec/changes/`目录下。每个变更包含`proposal.md`、`design.md`、`specs/`和`tasks.md`等产物。

执行流程如下：

1. 通过`/opsx:explore`在给定需求描述的前提下进行探索式对话，分析问题、设计方案、评估风险。
2. 当探索式对话结束并形成清晰方案时，通过`/opsx:propose <feature-name>`转化为正式`OpenSpec`变更提案。`feature-name`必须使用`kebab-case`，例如`user-auth`、`data-export`。
3. 通过`/opsx:apply`按照`tasks.md`逐条执行，完成代码实现、测试、文档更新等工作。


## OpenSpec 启用条件

- 只有在`openspec`工具安装时才启用`OpenSpec`执行流程，包括`/opsx:explore`、`/opsx:propose`、`/opsx:apply`、`/opsx:archive`及相关技能调用和文档生成。
- 如果未安装`openspec`工具，则不启用这些功能，用户需要手动维护变更文档和执行流程。

## 活跃变更判定

- 活跃`OpenSpec`变更的判定以是否归档为准。
- 凡是仍位于`openspec/changes/`根目录下、且未移动到`openspec/changes/archive/`中的变更目录，都属于活跃变更。
- 即便该变更已经完成全部任务、`openspec list --json`显示`status: complete`，只要尚未执行归档，仍然必须视为活跃变更。
- 只有位于`openspec/changes/archive/`下的变更才是非活跃变更。


## 并行协作要求

- 执行任务时，如果存在适合通过`subagent`并行推进且能够明确提升执行效率的场景，必须优先评估采用`subagent`协作，以降低上下文窗口溢出的风险。
- 仅在任务强依赖串行上下文、拆分成本过高或引入明显协作风险时，才可不使用`subagent`。
- 若当前执行环境或上层工具规则限制`subagent`使用，必须遵循更高优先级的执行约束，并在必要时通过本地串行方式完成任务。

## 文档语言要求

- 新建迭代文档时，`proposal.md`、`design.md`、`tasks.md`与增量规范的内容语言必须跟随用户输入的上下文语言。
- 用户以中文描述需求或明确要求中文时，文档使用中文。
- 用户以英文描述需求或明确要求英文时，文档使用英文。
- 同一个活跃`OpenSpec`变更中的文档默认保持同一语言，避免一次迭代内出现中英文混写；除非用户明确要求整体语言切换。

## Git 操作要求

- 在用户未明确要求的前提下，不能自行执行`git`提交或推送代码。
- 治理验证和审查结论不得暗示已经提交或推送，除非实际执行并得到用户授权。


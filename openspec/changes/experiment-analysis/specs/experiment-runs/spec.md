## ADDED Requirements

### Requirement: 按项目浏览实验 Run

拥有训练中心菜单的会话 MUST 能在当前工作集群浏览`Run`列表。列表 MUST 支持按项目、关键词、状态、创建人筛选并分页；筛选与分页 MUST 在数据库完成。非管理员 MUST 只看到所属团队的`Run`；管理员可见当前工作集群全部`Run`。每行 MUST 展示名称、关联任务状态、最新`Loss`、进度（`step`或`step/max_steps`）、吞吐、关联任务、创建人与更新时间。未读到的标量 MUST 显示`—`，不得显示`0`充数。名称列 MUST 展示`Run`名称，不得把数据库数字 ID 作为主标题。

#### Scenario: 算法工程师只看到本团队 Run

- **WHEN** `algo`属于「SLM预训练」而不属于「数据工程」，列表选「全部项目」且无其它筛选
- **THEN** 不出现「数据工程」团队任务关联的`Run`

#### Scenario: 未上报时 Loss 与进度为破折号

- **WHEN** 一条`Run`尚无`metrics_at`快照
- **THEN** `Loss`、进度与吞吐列显示`—`

#### Scenario: 读盘成功后展示 Loss 进度与吞吐

- **WHEN** 一条`Run`已成功回写`last_loss`、`last_step`、`max_steps`与`last_tokens_per_sec`
- **THEN** 列表对应列显示这些数字而不是`—`，进度为`step {last_step}/{max_steps}`

#### Scenario: 切换工作集群后只列出该集群 Run

- **WHEN** 用户在实验分析将工作集群从 A 切换为 B
- **THEN** 列表刷新为集群 B 的`Run`，不再保留仅属于 A 的行

### Requirement: 实验详情外层快照与页签

详情 MUST 展示`Run`名称、项目、标签区可省略本迭代、创建人、最新`Loss`、`step`、吞吐、关联任务入口，以及页签「`TensorBoard` / 曲线」「超参配置」「概览与路径」。本迭代「产物 / Checkpoint」与「系统指标」MUST 展示简要说明或空态，不浏览机房目录、不自绘完整曲线。超参配置 MUST 展示关联任务的镜像、节点数、每节点`GPU`、环境变量快照。概览 MUST 展示`tb_logdir`与复制路径。外层数字 MUST 来自数据库快照，不得在打开详情时由浏览器直连机房文件。

#### Scenario: 详情默认进入 TensorBoard 页签

- **WHEN** 用户从列表进入一条`Run`详情
- **THEN** 默认页签为「`TensorBoard` / 曲线」，页头可见最新`Loss`或`—`

#### Scenario: 可从实验跳到训练任务

- **WHEN** 详情关联了存在的训练任务且用户点击查看任务
- **THEN** 进入该任务详情

### Requirement: 对比页展示快照与超参 Diff

用户 MUST 能勾选 2 至 5 条`Run`进入对比页。对比页 MUST 并排展示外层快照，并用表格标出关联任务配置中取值不同的字段。当所选`Run`的集群与机房不完全相同时，MUST NOT 提供跨机房`TensorBoard`多`logdir`叠加，并展示中文说明。本迭代不在对比页自绘示意曲线。

#### Scenario: 少于两条时不能对比

- **WHEN** 列表只勾选 1 条`Run`
- **THEN** 「`TensorBoard`对比」按钮不可用

### Requirement: 移动与删除实验 Run

拥有训练中心菜单的会话 MUST 能把可见`Run`移动到另一个未删除项目，也 MUST 能软删除`Run`。移动 MUST 使用`PUT`只更新`project_id`。删除 MUST 使用`DELETE`，不得删除关联训练任务。已删除的`Run` MUST 不再出现在列表与详情；同一`job_id` MUST 不得因列表补建而重新插入。

#### Scenario: 移动后出现在目标项目

- **WHEN** 用户把`slm-7b-pretrain-phase4`从「默认项目」移动到`slm-7b-pretrain`
- **THEN** 该`Run`出现在目标项目筛选中，不再计入默认项目计数

#### Scenario: 删除后列表不再展示

- **WHEN** 用户删除一条可见`Run`
- **THEN** 列表不再出现该行，关联训练任务详情不再展示该实验入口

### Requirement: 为已有训练任务补建 Run

打开实验列表时，系统 MUST 为当前工作集群中尚无实验行（含已软删除）的训练任务幂等补建`Run`，项目为 Seed`default`，失败 MUST NOT 让列表接口失败。历史任务因此会出现在实验分析中，无需重新提交。

#### Scenario: 历史任务出现在实验列表

- **WHEN** 集群中已有训练任务且从未创建过`exp_run`
- **THEN** 打开实验分析后该任务对应的`Run`出现在列表中


#### Scenario: 跨机房只对比数字与超参

- **WHEN** 用户勾选两条分属不同`datacenter_code`的`Run`并进入对比
- **THEN** 可见快照与超参 Diff，不出现跨机房打开同一`TensorBoard`对比的主按钮

## 1. 数据与 kube 扩展

- [x] 1.1 新增`005-training-center.sql`：`train_job`、`train_config_set`、`train_config_version`、`train_config_draft`及索引
- [x] 1.2 把新表加入`gfcli` dao 清单，执行`make db.init`与`make dao`
- [x] 1.3 扩展`kube.ClusterClient`：确保命名空间、`ConfigMap`、AbortJob、ListJobPods、GetPodLogs；更新`Fake`与单测

## 2. 训练后端

- [x] 2.1 定义训练集群/队列/任务/配置/运行用户 API（`permission:"training:*"`），执行`make ctrl`
- [x] 2.2 团队增加`ListIDsByUserID`；用户增加`MapByIDs`；队列增加按集群+团队返回完整投影
- [x] 2.3 实现`traincfg`：草稿、发布、列表可见性、归档；文件 50 KB 限制
- [x] 2.4 实现`trainjob`：提交（创建 Volcano Job + ConfigMap）、列表筛选分页、详情、停止、重跑字段、Pod/日志、我的队列卡时聚合、关联告警
- [x] 2.5 装配 HTTP 与权限；告警详情在节点交集时返回关联任务
- [x] 2.6 补充 trainjob/traincfg/kube 单元测试
- [x] 2.7 配置挂载`ConfigMap`设置`Volcano Job` `ownerReference`，Job 删除时级联销毁

## 3. 控制台前端

- [x] 3.1 启用`training`模块：侧栏四菜单、落地页、工作集群选择；隐藏实验分析
- [x] 3.2 任务列表、新建/重跑、详情（配置/Pod 日志/告警 + 监控与日志检索占位）
- [x] 3.3 我的队列页：汇总、嵌套活跃任务、提交/任务跳转
- [x] 3.4 配置管理：列表、编辑草稿、发布、详情与版本历史
- [x] 3.5 告警中心在可关联时展示「查看任务」；更新`README.md`

## 4. 验证

- [x] 4.1 运行`Go`测试与`make lint`
- [x] 4.2 新增训练中心 E2E：algo 菜单与落地、空列表、新建校验、配置草稿/发布；更新旧用例中「任务列表不可见」
- [x] 4.3 有集群时走通提交任务（`kubectl -n maip get vcjob`）；无集群时记录剩余风险

## 5. 反馈

- [x] 5.1 任务列表名称列去掉数据库 ID；创建表单写明 Kubernetes DNS-1123 对象名约束（最长 63），并补非法名称与列表展示 E2E
- [x] 5.2 问号帮助改为原型浮层：悬停立即显示，不再使用浏览器原生延迟 `title`；队列弹窗共用同一组件
- [x] 5.3 创建/重跑页运行用户选择对齐原型：焦点即出候选、选中后锁定输入并展示 chip/清除、重跑回填运行用户；管理员未指定时工作路径不写 `admin`
- [x] 5.4 顶栏切换工作集群后任务列表（及同钩子的我的队列/新建任务）按新集群重新拉取，不再沿用壳层私有 state
- [x] 5.5 停止时集群中`Volcano Job`不存在视为已停止并写`cancelled`，不再把英文`Volcano job does not exist`抛给用户；补单测与 E2E
- [x] 5.6 刷新页面时工作集群不得在候选列表未返回前回退为第一项；补 E2E
- `.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`仍缺失：视觉对齐`prototype.css`，文案用中文，无独立语言包。无数据库与接口路径变更。
- 5.2：无 API/数据库变更。无行级数据权限。无`i18n`语言包（既有中文 tip 文案不变）。`.agents/rules/frontend-ui.md`缺失，浮层样式沿用`prototype.css`的`.field-help-floating-tip`。
- 5.3：无 API/数据库变更。无行级数据权限。无`i18n`语言包（中文文案沿用原型）。`.agents/rules/frontend-ui.md`缺失，选择器样式沿用`prototype.css`的`.user-picker-*`。
- 5.4：无 API/数据库变更。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，顶栏切换交互不变。
- 5.5：仅补充停止接口`dc`语义（`Job`不存在视为已停止），无新路径、无数据库变更。无行级数据权限。无`i18n`语言包。架构模块边界无影响。`.agents/rules/frontend-ui.md`缺失，停止确认弹窗与 toast 沿用现有组件。
- 5.6：无 API/数据库变更。无行级数据权限。无`i18n`语言包。架构模块边界无影响。`.agents/rules/frontend-ui.md`缺失，顶栏选择器交互不变。

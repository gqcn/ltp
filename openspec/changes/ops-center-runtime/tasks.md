## 1. 数据与本地集群

- [x] 1.1 新增`004-ops-center-runtime.sql`：集群、队列、队列-团队、节点维护记录、告警表及索引
- [x] 1.2 增加`hack/deploy/kind`配置、`make kind.up`/`kind.down`，创建`Kubernetes 1.27`的`kind`集群并用`Helm`安装`Volcano 1.13`
- [x] 1.3 执行`make db.init`与`make dao`，把新表纳入`gfcli`生成清单
- [x] 1.4 配置模板增加`ops.fastx.webhookToken`说明

## 2. Kubernetes 与 Volcano 客户端

- [x] 2.1 实现`kube`服务：`Factory`/`ClusterClient`接口，覆盖版本探测、节点列表、节点补丁、Queue 应用/读取/删除
- [x] 2.2 生产实现使用`client-go`与`scheduling.volcano.sh/v1beta1`；测试注入替身
- [x] 2.3 补充 kube 替身单元测试

## 3. 运维后端

- [x] 3.1 定义集群/节点/队列/告警/Webhook API，执行`make ctrl`并实现控制器转换
- [x] 3.2 实现集群服务：接入、列表 KPI、探测、编辑、删除；`Kubeconfig`不回传
- [x] 3.3 实现节点服务：筛选分页、数据中心/标签/污点、隔离入池、维护记录；一次 List 装配
- [x] 3.4 实现队列服务：CRUD、团队关联、与 Volcano Queue 同步、占用检查
- [x] 3.5 实现告警服务：Webhook 解析入库、列表筛选、处理/批量处理、未完成计数
- [x] 3.6 数据中心`UsageCounter`改为真实节点/队列/集群统计；团队详情批量投影关联队列
- [x] 3.7 装配 HTTP：受保护运维路由 + 公开 FastX Webhook；Webhook 令牌校验
- [x] 3.8 补充集群/队列/告警服务单元测试

## 4. 控制台前端

- [x] 4.1 壳层开放运维四菜单、工作集群选择、告警角标；集群概览与训练中心仍隐藏
- [x] 4.2 实现集群管理页：KPI、列表、接入/编辑/探测/删除、详情
- [x] 4.3 实现节点管理页：筛选分页、批量/单节点数据中心与标签污点、隔离入池、维护记录
- [x] 4.4 实现队列管理页：筛选分页、新建/编辑、启用禁用删除、额度条
- [x] 4.5 实现告警中心页：KPI、筛选、详情、处理/批量处理、跳转节点；隐藏任务入口
- [x] 4.6 团队详情展示关联队列空态或列表
- [x] 4.7 更新根`README.md`与 FastX 对接说明文档

## 5. 验证

- [x] 5.1 运行`Go`测试与`make lint`
- [x] 5.2 新增运维中心 E2E：菜单、集群空态、队列页、告警 Webhook 入库
- [x] 5.3 启动`kind`+Volcano 与本地服务，走通接入集群、创建队列（`kubectl get queue`）、推送 FastX 示例 JSON

## 6. 表单校验中文与聚焦（反馈）

- [x] 6.1 前端统一字段级中文校验：错误展示在输入域旁，提交失败聚焦首个无效域
- [x] 6.2 覆盖登录、数据中心、集群、队列、团队、LDAP 配置、角色、用户、节点、告警表单
- [x] 6.3 后端 DTO `v` 标签与服务层表单校验改为中文；GoFrame 英文校验句在响应层翻译
- [x] 6.4 补充 E2E：空提交中文错误、聚焦无效输入，且不出现英文校验句

## 7. 用成熟库替换自研表单轮子（反馈）

- [x] 7.1 表单校验改为`zod` +`react-hook-form`，删除自研校验引擎
- [x] 7.2 Toast 改走已有依赖`sonner`；弹层改走`@radix-ui/react-dialog`，视觉仍对齐`prototype.css`
- [x] 7.3 保留`Button`/`Field`/`Pagination`/`ColorField`等原型薄封装，不引入整套 UI 组件库

## 8. 系统配置 Toast 对齐原型（反馈）

- [x] 8.1 覆盖`sonner`默认叠卡片/绝对定位，Toast 恢复原型左色条卡片与右上纵向排列
- [x] 8.2 补充系统配置「测试连接」成功 Toast 的 E2E 与截图

## 9. 表单默认长度（反馈）

- [x] 9.1 单行默认最长 64、多行默认最长 256；`DNS-1123`/色值/角色名/`Kubeconfig`保持特例
- [x] 9.2 后端写接口`v`标签与前端对齐
- [x] 9.3 补充超长单行/多行中文错误 E2E

## 10. 用户列表列宽对齐原型（反馈）

- [x] 10.1 去掉用户表`table-layout: fixed`，列宽改回原型自动排布；「最近登录」表头完整可见
- [x] 10.2 更新用户表布局 E2E：表头不截断

## 11. kind 模拟 GPU 节点（反馈）

- [x] 11.1 `kind`集群改为控制面 + 三个模拟`GPU`工作节点，写入`GFD`/平台标签与`nvidia.com/gpu`容量
- [x] 11.2 控制面安装回填进程，避免`kubelet`清掉扩展资源
- [x] 11.3 更新`README`/`hack/deploy/kind`说明；旧单节点拓扑提示重建
- [x] 11.4 `make kind.up`后核对应节点`allocatable.nvidia.com/gpu`大于 0

## 12. 节点列表展示隔离备注（反馈）

- [x] 12.1 节点列表批量装配当前页已隔离节点最近一次成功隔离备注
- [x] 12.2 「隔离信息」列与详情展示该备注，而不是只写「已隔离」
- [x] 12.3 单元测试覆盖隔离后列表带备注、入池后清空；E2E 走隔离填备注并断言列表可见

## 13. 队列卡型号不下发 cpu 占位（反馈）

- [x] 13.1 额度预览只把节点真实 GPU 标签列为卡型号，无标签节点与历史`cpu`队列不进入下拉
- [x] 13.2 新建/编辑表单去掉`cpu（无 GPU 节点）`选项
- [x] 13.3 单元测试覆盖无标签节点不产生`cpu`型号；E2E 断言新建队列下拉不含`cpu`

## 14. Volcano Queue 丢失可重新同步（反馈）

- [x] 14.1 列表同步失败改为中文「找不到对应的 Volcano Queue」
- [x] 14.2 提供`POST /queues/{id}/sync`，按库中元数据`ApplyQueue`
- [x] 14.3 队列行在同步异常时显示「重新同步」；单元测试覆盖 CR 删除后 Resync 恢复

## 15. 节点标签污点 Kubernetes 语法校验（反馈）

- [x] 15.1 前端标签/污点表单按 Kubernetes qualified name 与 label value 规则校验；污点 effect 限定三值；错误中文展示并聚焦
- [x] 15.2 输入长度上限与 K8s 对齐：名称/value 63，带前缀 key 最长 317，不再套用默认 64
- [x] 15.3 补充 E2E：非法 key/value 中文错误与聚焦，合法带前缀 key 可添加

## 16. 队列额度不得超过剩余容量（反馈）

- [x] 16.1 创建/更新按数据中心剩余容量拒绝超额`GPU`/`CPU`/内存
- [x] 16.2 表单提交前展示中文超额错误并聚焦首个超额字段
- [x] 16.3 单元测试覆盖超额拒绝；E2E 超额提交可见中文错误

## 17. 队列与任务名称对齐 Volcano（反馈）

- [x] 17.1 队列标识按 Volcano Queue / DNS-1123 子域校验（允许点，最长 63，排除 root/default）；前端中文错误并聚焦
- [x] 17.2 创建 Volcano Job 时校验 Job 名（子域 ∩ qualified name）与 task 名（DNS-1123 label）；非法名拒绝
- [x] 17.3 单元测试覆盖非法/保留/带点名称；E2E 覆盖队列非法标识与合法带点标识

## 18. 列表初始化展示加载进度（反馈）

- [x] 18.1 列表未返回数据时展示加载进度，不得显示空态「没有匹配/暂无数据」
- [x] 18.2 覆盖数据中心、集群、节点、队列、告警、用户、团队、角色列表
- [x] 18.3 E2E 延迟列表接口，断言加载文案出现且空态不出现

## 19. 节点管理对齐原型列表与徽章（反馈）

- [x] 19.1 页面根节点补`id="page-node-mgmt"`，宽表在卡片内横向滚动，露出`状态`/`Pods`/`隔离信息`
- [x] 19.2 状态徽章展示`Ready`与`SchedulingDisabled`组合；维护记录操作/结果改徽章；详情 Conditions 展示标准 kubelet 条件
- [x] 19.3 E2E 断言列表列可见、维护记录徽章、详情`Ready=True`
- `.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`仍缺失：视觉对齐`prototype.css`。无数据库变更。无行级数据权限。架构模块边界无影响。

## 规则影响记录

- 前端视觉以`prototype.v4`为准（`.agents/rules/frontend-ui.md`缺失）。引入无外观的表单/弹层库（`zod`、`react-hook-form`、`@radix-ui/react-dialog`）和已有的`sonner`，不引入 Ant Design / MUI 等会覆盖原型视觉的组件库。
- 运行时文案使用中文，不引入语言包（`.agents/rules/i18n.md`缺失）。本迭代有运行时中文文案，判定有`i18n`展示影响但沿用现有控制台做法。表单校验失败改为中文字段错误，不新增语言包。
- 本迭代无行级数据权限（`.agents/rules/data-permission.md`缺失，判定无影响）。
- 架构：未新增业务模块或跨模块契约，仅替换前端表单/弹层/Toast 实现，判定无架构影响。
- 接口契约：DTO`v`标签补充默认长度（单行 64、多行 256），不改变路径、方法或字段结构。
- 不引入字典模块；枚举使用 Go 命名类型。
- 文档编写遵守`.agents/rules/documentation.md`与 markdown 格式指令。
- 11：本地`kind`实验室按文章用标签 + 节点`status`模拟`GPU`，不改业务 API 结构、数据库或控制台交互。无行级数据权限影响。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失且本段无页面改动。不新增 Playwright（环境依赖本机`kind`）；验收为`kind.up`后`kubectl`可见`nvidia.com/gpu`。
- 12：节点列表新增`isolateRemark`（只读投影，路径不变）。隔离备注按当前页一次`IN`查询装配，无`N+1`。无行级数据权限。无`i18n`语言包（展示用户填写的备注）。`.agents/rules/frontend-ui.md`缺失，列文案对齐现有「已隔离」与维护记录备注。SQL 在`004`追加维护记录查询索引。
- 13：队列卡型号候选项不再使用`cpu`占位。接口路径不变，仅预览`gpuTypes`内容收窄。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，下拉文案去掉`cpu（无 GPU 节点）`。
- 14：新增`POST /queues/{id}/sync`（动作，非查询）。同步文案中文，无语言包。无行级数据权限。`.agents/rules/frontend-ui.md`缺失，按钮沿用现有`Button`。`make kind.down`会丢掉 CR，属环境问题，产品侧提供重新同步而非自动在`GET`列表写集群。
- 15：节点标签/污点前端校验对齐`Kubernetes`语法。不改 API 路径、方法或字段结构（接口契约无影响）。不改后端服务与数据库（`backend-go`/`database`无影响）。无行级数据权限。无`i18n`语言包，新增中文校验句。`.agents/rules/frontend-ui.md`缺失，错误展示对齐现有字段级红字。
- 16：创建/更新增加剩余容量校验，不改路径与字段。无行级数据权限。无`i18n`语言包。`.agents/rules/frontend-ui.md`缺失，错误对齐字段级红字。已有超额队列不强制改写，仅拦截新的写操作；重新同步不走该校验。
- 17：队列/任务名对齐`Volcano`与 Kubernetes 对象名。不改路径与字段结构。无行级数据权限。无`i18n`语言包，新增中文校验句。`.agents/rules/frontend-ui.md`缺失，错误对齐字段级红字。训练中心未启用，任务名无独立页面，校验落在`kube.CreateJob`。
- 18：列表初始化加载态。无 API/数据库变更。无行级数据权限。无`i18n`语言包，中文「正在加载…」。`.agents/rules/frontend-ui.md`缺失，加载样式对齐`prototype.css`的`--primary`与`.empty-state`留白。

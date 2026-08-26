## Why

仓库目前只有治理文件，尚无可以运行的训练平台。完整复刻原型中的训练、运维、平台全部模块风险过高，需要先落地一套可运行的工程骨架，并用一个业务模块跑通「登录 → 页面 → API → 数据库 → 再回到页面」的闭环，作为后续模块的对照样板。

## What Changes

- 按`GoFrame v2`约定初始化后端工程目录（`api/`、`internal/`、`manifest/`、`hack/`），配套`Makefile`、`PostgreSQL`初始化与代码生成入口。
- 前端采用`React` + `TypeScript` + `Vite` + `Tailwind CSS`，视觉与交互对齐`prototype.v4`运维控制台，而不是另起一套通用后台皮肤。
- 实现本地平台管理员登录、会话保持与退出，作为首个闭环的身份入口；`LDAP`登录本迭代不实现。
- 实现运维中心「数据中心管理」完整闭环：列表筛选分页、新建、编辑、启用/停用、删除，以及内置默认数据中心不可停用、不可删除。
- 侧栏只展示本迭代已启用的模块；训练中心、集群、队列、任务等菜单全部隐藏，避免空白页或报错。
- 补充后端单元测试与数据中心`E2E`，用于证明闭环可验收。

## Capabilities

### New Capabilities

- `admin-auth`: 本地平台管理员账号登录、读取当前会话、退出登录。
- `datacenter-management`: 数据中心资源的创建、查询、更新、启停与删除，以及默认数据中心保护规则。
- `ops-console-shell`: 登录页与登录后控制台壳层（主题、侧栏、顶栏、模块隐藏），承接首个业务页。

### Modified Capabilities

- 无。仓库尚无基线规格。

## Impact

- 新增后端`Go`模块、`PostgreSQL`表、HTTP API、前端页面与`Playwright`测试。
- 运行期依赖`PostgreSQL`；本地通过`Docker Compose`提供。
- 本迭代不接入`Kubernetes`、`Volcano`、`LDAP`，也不实现任务、队列、集群、节点、用户/团队/角色等后续模块。
- 规则文件`.agents/rules/frontend-ui.md`与`.agents/rules/i18n.md`当前缺失：前端以原型为视觉事实来源，运行时文案使用中文，不引入独立语言包；任务记录中明确该判断。

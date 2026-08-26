# LTP Backend

`apps/backend`是`GoFrame v2`宿主服务，负责 HTTP 契约、业务服务、生成的`DAO`产物、运行配置和 SQL。

## 目录

```text
api/              对外 HTTP 契约
internal/cmd/     进程入口与 SQL 初始化
internal/controller/ HTTP 处理
internal/service/ 业务逻辑
manifest/config/  运行配置
manifest/sql/     幂等 PostgreSQL DDL 与种子数据
pkg/              宿主共享包
```

## 命令

在仓库根目录执行：

```bash
make dao
make ctrl
make db.init
make test.unit
```

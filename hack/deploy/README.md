# Deploy

本地开发使用本机`PostgreSQL`，地址`127.0.0.1:5432`，数据库名`ltp`。`make db.up`会等待该实例就绪，并在库不存在时创建它。

`docker-compose.yml`是可选文件，默认 Make 目标不会使用它。

```bash
make db.up
make db.init
```

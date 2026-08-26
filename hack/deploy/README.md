# Deploy

本地开发使用本机`PostgreSQL`，地址`127.0.0.1:5432`，数据库名`ltp`。`make db.up`会等待该实例就绪，并在库不存在时创建它。

`docker-compose.yml`提供可选的模拟`LDAP`。默认 Make 目标不会启动其中的`PostgreSQL`服务。

```bash
make db.up
make db.init
make ldap.up
make status
```

模拟`LDAP`映射到`127.0.0.1:1389`，`Base DN`为`dc=msxf,dc=com`，服务账号为`cn=admin,dc=msxf,dc=com` / `admin`。演示用户`algo` / `algo123`与`sre` / `sre123`已写入目录，并在`make db.init`时加入平台可用用户。

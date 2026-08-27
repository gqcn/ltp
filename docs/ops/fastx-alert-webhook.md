# FastX 告警 Webhook 对接说明

运维中心「告警中心」通过 HTTP Webhook 接收企业内部 FastX 告警。平台解析后写入告警列表，运维可筛选、查看原始 JSON 并处理。

## 接入地址

| 环境 | 方法 | URL |
| --- | --- | --- |
| 本地开发 | `POST` | `http://127.0.0.1:8000/api/webhooks/fastx/alerts` |
| 生产 | `POST` | `https://<平台域名>/api/webhooks/fastx/alerts` |

该接口**不需要**登录会话。生产环境必须配置共享令牌。

## 鉴权

在`apps/backend/manifest/config/config.yaml`中配置：

```yaml
ops:
  fastx:
    webhookToken: "请替换为生产令牌"
```

| 配置 | 行为 |
| --- | --- |
| `webhookToken`为空 | 不校验，仅用于本地 |
| `webhookToken`非空 | 请求必须携带相同令牌 |

令牌传递方式（任选其一）：

- 请求头`X-FastX-Token: <token>`
- 查询参数`?token=<token>`

令牌不匹配时返回业务错误`ALERT_WEBHOOK_UNAUTHORIZED`，不会入库。

## 请求体

`Content-Type`为`application/json`。字段与 FastX 推送保持一致。

| 字段 | 映射 |
| --- | --- |
| `alarmInfo.name` | 告警标题；为空时回落`originalBody.faultName` |
| `originalBody.faultName` | 故障信息 |
| `alarmInfo.level` | `1`→`info`，`2`→`warning`，`>=3`→`critical` |
| `alarmInfo.alarmData` | 生成告警简述；从标签提取`Hostname`或`instance`作为节点 |
| `alarmInfo.firstAlarmTime` | 首次告警时间，格式`2006-01-02 15:04:05.0` |
| 整个 JSON | 原样存入详情，便于排障 |

成功响应（统一信封，`code`为`0`）包含新建告警`id`。

## curl 示例

```bash
curl -sS -X POST 'http://127.0.0.1:8000/api/webhooks/fastx/alerts' \
  -H 'Content-Type: application/json' \
  -d '{
    "originalBody": {
      "faultName": "GPU-XID79卡故障-测试故障456",
      "faultEnv": null,
      "cluster": null,
      "handlingStrategy": "manual"
    },
    "alarmInfo": {
      "ruleId": null,
      "alarmCount": 1,
      "level": 2,
      "name": "wjl-test-告警",
      "alarmData": [
        ["告警条件", "当前值", "标签"],
        ["> 0", "100.0", "instance:msxf-hpc-2-125-ai,Hostname:msxf-hpc-2-125-ai,gpu:4,__name__:DCGM_FI_DEV_GPU_UTIL,"]
      ],
      "firstAlarmTime": "2026-08-18 16:50:52.0",
      "createUser": "jialing.wu"
    }
  }'
```

推送成功后，用管理员或`SRE`登录控制台，打开「告警中心」，即可看到标题为`wjl-test-告警`的待处理记录。

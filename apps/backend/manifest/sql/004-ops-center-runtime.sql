-- 004：运维中心集群 / 队列 / 节点维护记录 / 告警初始化。

CREATE TABLE IF NOT EXISTS ops_cluster (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(64)  NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description  VARCHAR(512) NOT NULL DEFAULT '',
    kubeconfig   TEXT         NOT NULL,
    api_server   VARCHAR(512) NOT NULL DEFAULT '',
    k8s_version  VARCHAR(64)  NOT NULL DEFAULT '',
    status       VARCHAR(16)  NOT NULL DEFAULT 'unknown',
    last_sync_at TIMESTAMP,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    deleted_at   TIMESTAMP
);

COMMENT ON TABLE ops_cluster IS '接入的 Kubernetes 训练集群，凭证以 Kubeconfig 保存';
COMMENT ON COLUMN ops_cluster.id IS '集群 ID';
COMMENT ON COLUMN ops_cluster.name IS '由显示名称派生的稳定标识';
COMMENT ON COLUMN ops_cluster.display_name IS '显示名称';
COMMENT ON COLUMN ops_cluster.description IS '说明';
COMMENT ON COLUMN ops_cluster.kubeconfig IS 'Kubeconfig YAML，接口响应不回传';
COMMENT ON COLUMN ops_cluster.api_server IS '探测得到的 API Server 地址';
COMMENT ON COLUMN ops_cluster.k8s_version IS '探测得到的 Kubernetes 版本';
COMMENT ON COLUMN ops_cluster.status IS '连通状态：healthy / offline / unknown';
COMMENT ON COLUMN ops_cluster.last_sync_at IS '最近一次成功连通时间';
COMMENT ON COLUMN ops_cluster.created_at IS '创建时间';
COMMENT ON COLUMN ops_cluster.updated_at IS '更新时间';
COMMENT ON COLUMN ops_cluster.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_cluster_name ON ops_cluster (name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_cluster_display_name ON ops_cluster (display_name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ops_queue (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id      BIGINT       NOT NULL,
    name            VARCHAR(63)  NOT NULL,
    display_name    VARCHAR(128) NOT NULL,
    datacenter_code VARCHAR(64)  NOT NULL,
    gpu_type        VARCHAR(128) NOT NULL DEFAULT '',
    gpu_quota       INT          NOT NULL DEFAULT 0,
    cpu_quota       INT          NOT NULL DEFAULT 0,
    mem_quota_gi    INT          NOT NULL DEFAULT 0,
    weight          INT          NOT NULL DEFAULT 1,
    reclaimable     BOOLEAN      NOT NULL DEFAULT TRUE,
    features        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    description     VARCHAR(512) NOT NULL DEFAULT '',
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP
);

COMMENT ON TABLE ops_queue IS '业务资源队列，与集群中的 Volcano Queue 同名对应';
COMMENT ON COLUMN ops_queue.id IS '队列 ID';
COMMENT ON COLUMN ops_queue.cluster_id IS '所属集群 ID';
COMMENT ON COLUMN ops_queue.name IS 'Volcano Queue 对象名，创建后不可改';
COMMENT ON COLUMN ops_queue.display_name IS '显示名称';
COMMENT ON COLUMN ops_queue.datacenter_code IS '绑定的数据中心标识';
COMMENT ON COLUMN ops_queue.gpu_type IS '卡型号';
COMMENT ON COLUMN ops_queue.gpu_quota IS 'GPU 额度（卡）';
COMMENT ON COLUMN ops_queue.cpu_quota IS 'CPU 额度（核）';
COMMENT ON COLUMN ops_queue.mem_quota_gi IS '内存额度（GiB）';
COMMENT ON COLUMN ops_queue.weight IS 'Volcano 队列权重';
COMMENT ON COLUMN ops_queue.reclaimable IS '是否允许回收';
COMMENT ON COLUMN ops_queue.features IS '功能特性 JSON 数组，例如 ["ib"]';
COMMENT ON COLUMN ops_queue.description IS '说明';
COMMENT ON COLUMN ops_queue.created_at IS '创建时间';
COMMENT ON COLUMN ops_queue.updated_at IS '更新时间';
COMMENT ON COLUMN ops_queue.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_queue_cluster_name ON ops_queue (cluster_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ops_queue_cluster_id ON ops_queue (cluster_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ops_queue_datacenter_code ON ops_queue (datacenter_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ops_queue_team (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    queue_id   BIGINT NOT NULL,
    team_id    BIGINT NOT NULL,
    created_at TIMESTAMP
);

COMMENT ON TABLE ops_queue_team IS '队列与团队多对多关联';
COMMENT ON COLUMN ops_queue_team.id IS '关联 ID';
COMMENT ON COLUMN ops_queue_team.queue_id IS '队列 ID';
COMMENT ON COLUMN ops_queue_team.team_id IS '团队 ID';
COMMENT ON COLUMN ops_queue_team.created_at IS '创建时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_queue_team ON ops_queue_team (queue_id, team_id);
CREATE INDEX IF NOT EXISTS idx_ops_queue_team_team_id ON ops_queue_team (team_id);

CREATE TABLE IF NOT EXISTS ops_node_event (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id BIGINT       NOT NULL,
    node_name  VARCHAR(253) NOT NULL,
    action     VARCHAR(32)  NOT NULL,
    operator   VARCHAR(64)  NOT NULL DEFAULT '',
    remark     VARCHAR(512) NOT NULL DEFAULT '',
    result     VARCHAR(16)  NOT NULL DEFAULT 'success',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

COMMENT ON TABLE ops_node_event IS '节点维护记录（隔离 / 入池 / 数据中心 / 标签 / 污点）';
COMMENT ON COLUMN ops_node_event.id IS '记录 ID';
COMMENT ON COLUMN ops_node_event.cluster_id IS '所属集群 ID';
COMMENT ON COLUMN ops_node_event.node_name IS 'Kubernetes 节点名';
COMMENT ON COLUMN ops_node_event.action IS '动作：isolate / recover / set-dc / labels / taints';
COMMENT ON COLUMN ops_node_event.operator IS '操作者显示名';
COMMENT ON COLUMN ops_node_event.remark IS '备注';
COMMENT ON COLUMN ops_node_event.result IS '结果：success / fail';
COMMENT ON COLUMN ops_node_event.created_at IS '创建时间';
COMMENT ON COLUMN ops_node_event.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_ops_node_event_cluster_created ON ops_node_event (cluster_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_node_event_node_name ON ops_node_event (node_name);
CREATE INDEX IF NOT EXISTS idx_ops_node_event_cluster_action_node ON ops_node_event (cluster_id, action, result, node_name, id DESC);

CREATE TABLE IF NOT EXISTS ops_alert (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id      BIGINT,
    severity        VARCHAR(16)   NOT NULL,
    title           VARCHAR(256)  NOT NULL,
    alert_info      TEXT          NOT NULL DEFAULT '',
    fault_info      TEXT          NOT NULL DEFAULT '',
    source          VARCHAR(128)  NOT NULL DEFAULT 'FastX',
    node_names      VARCHAR(1024) NOT NULL DEFAULT '',
    status          VARCHAR(16)   NOT NULL DEFAULT 'open',
    handle_remark   VARCHAR(512)  NOT NULL DEFAULT '',
    handled_at      TIMESTAMP,
    handled_by      VARCHAR(64)   NOT NULL DEFAULT '',
    first_alarm_at  TIMESTAMP,
    alarm_count     INT           NOT NULL DEFAULT 1,
    alarm_level     INT           NOT NULL DEFAULT 2,
    create_user     VARCHAR(64)   NOT NULL DEFAULT '',
    webhook_payload JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

COMMENT ON TABLE ops_alert IS 'FastX Webhook 写入的告警';
COMMENT ON COLUMN ops_alert.id IS '告警 ID';
COMMENT ON COLUMN ops_alert.cluster_id IS '可选关联集群 ID';
COMMENT ON COLUMN ops_alert.severity IS '级别：info / warning / critical';
COMMENT ON COLUMN ops_alert.title IS '告警标题';
COMMENT ON COLUMN ops_alert.alert_info IS '面向用户的告警信息';
COMMENT ON COLUMN ops_alert.fault_info IS '故障信息，可空';
COMMENT ON COLUMN ops_alert.source IS '来源';
COMMENT ON COLUMN ops_alert.node_names IS '从标签解析的节点名，逗号分隔';
COMMENT ON COLUMN ops_alert.status IS '处理状态：open / following / handled';
COMMENT ON COLUMN ops_alert.handle_remark IS '最近处理备注';
COMMENT ON COLUMN ops_alert.handled_at IS '最近处理时间';
COMMENT ON COLUMN ops_alert.handled_by IS '最近处理人';
COMMENT ON COLUMN ops_alert.first_alarm_at IS 'FastX 首次告警时间';
COMMENT ON COLUMN ops_alert.alarm_count IS 'FastX 告警次数';
COMMENT ON COLUMN ops_alert.alarm_level IS 'FastX 原始 level';
COMMENT ON COLUMN ops_alert.create_user IS 'FastX 创建人';
COMMENT ON COLUMN ops_alert.webhook_payload IS '原始 Webhook JSON';
COMMENT ON COLUMN ops_alert.created_at IS '入库时间';
COMMENT ON COLUMN ops_alert.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_ops_alert_status_created ON ops_alert (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_alert_severity ON ops_alert (severity);
CREATE INDEX IF NOT EXISTS idx_ops_alert_cluster_id ON ops_alert (cluster_id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_first_alarm_at ON ops_alert (first_alarm_at DESC);

-- 数据中心取消启停：存量记录一律视为可用。
UPDATE ops_datacenter
SET enabled = TRUE
WHERE enabled IS DISTINCT FROM TRUE
  AND deleted_at IS NULL;

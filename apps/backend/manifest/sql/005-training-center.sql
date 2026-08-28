-- 005：训练中心任务与配置集初始化。

CREATE TABLE IF NOT EXISTS train_job (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id              BIGINT        NOT NULL,
    name                    VARCHAR(63)   NOT NULL,
    namespace               VARCHAR(63)   NOT NULL DEFAULT 'maip',
    team_id                 BIGINT        NOT NULL,
    team_name               VARCHAR(128)  NOT NULL DEFAULT '',
    queue_id                BIGINT        NOT NULL,
    queue_name              VARCHAR(63)   NOT NULL DEFAULT '',
    queue_display_name      VARCHAR(128)  NOT NULL DEFAULT '',
    datacenter_code         VARCHAR(64)   NOT NULL DEFAULT '',
    gpu_type                VARCHAR(128)  NOT NULL DEFAULT '',
    require_ib              BOOLEAN       NOT NULL DEFAULT FALSE,
    priority                VARCHAR(8)    NOT NULL DEFAULT 'P2',
    status                  VARCHAR(16)   NOT NULL DEFAULT 'queued',
    volcano_phase           VARCHAR(32)   NOT NULL DEFAULT '',
    volcano_uid             VARCHAR(64)   NOT NULL DEFAULT '',
    nodes                   INT           NOT NULL,
    gpus_per_node           INT           NOT NULL,
    gpu_count               INT           NOT NULL,
    cpu_per_node            INT           NOT NULL,
    mem_gi_per_node         INT           NOT NULL,
    image                   VARCHAR(512)  NOT NULL,
    command                 TEXT          NOT NULL,
    env                     JSONB         NOT NULL DEFAULT '{}'::jsonb,
    workdir                 VARCHAR(512)  NOT NULL,
    owner_user_id           BIGINT        NOT NULL,
    owner_username          VARCHAR(64)   NOT NULL,
    owner_nickname          VARCHAR(128)  NOT NULL DEFAULT '',
    submitted_by_user_id    BIGINT        NOT NULL,
    submitted_by_username   VARCHAR(64)   NOT NULL,
    submitted_by_nickname   VARCHAR(128)  NOT NULL DEFAULT '',
    rerun_from_id           BIGINT,
    fail_reason             TEXT          NOT NULL DEFAULT '',
    config_mounts           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    pod_nodes               VARCHAR(2048) NOT NULL DEFAULT '',
    sync_error              VARCHAR(256)  NOT NULL DEFAULT '',
    list_bucket             SMALLINT      NOT NULL DEFAULT 1,
    priority_order          SMALLINT      NOT NULL DEFAULT 2,
    started_at              TIMESTAMP,
    ended_at                TIMESTAMP,
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP,
    deleted_at              TIMESTAMP
);

ALTER TABLE train_job ADD COLUMN IF NOT EXISTS list_bucket SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE train_job ADD COLUMN IF NOT EXISTS priority_order SMALLINT NOT NULL DEFAULT 2;

COMMENT ON TABLE train_job IS '训练任务业务行，对应集群中的 Volcano Job';
COMMENT ON COLUMN train_job.id IS '任务 ID';
COMMENT ON COLUMN train_job.cluster_id IS '工作集群 ID';
COMMENT ON COLUMN train_job.name IS 'Volcano Job 对象名';
COMMENT ON COLUMN train_job.namespace IS 'Kubernetes 命名空间，固定 maip';
COMMENT ON COLUMN train_job.team_id IS '所属团队 ID';
COMMENT ON COLUMN train_job.team_name IS '提交时团队名称快照';
COMMENT ON COLUMN train_job.queue_id IS '资源队列 ID';
COMMENT ON COLUMN train_job.queue_name IS 'Volcano Queue 名快照';
COMMENT ON COLUMN train_job.queue_display_name IS '队列显示名快照';
COMMENT ON COLUMN train_job.datacenter_code IS '数据中心标识快照';
COMMENT ON COLUMN train_job.gpu_type IS '卡型号快照';
COMMENT ON COLUMN train_job.require_ib IS '是否使用 IB，取自队列特性';
COMMENT ON COLUMN train_job.priority IS '优先级：P0 / P1 / P2 / P3';
COMMENT ON COLUMN train_job.status IS '平台状态：queued / starting / running / success / failed / cancelled';
COMMENT ON COLUMN train_job.volcano_phase IS '最近一次 Volcano Job 相位';
COMMENT ON COLUMN train_job.volcano_uid IS 'Volcano Job UID';
COMMENT ON COLUMN train_job.nodes IS '节点数';
COMMENT ON COLUMN train_job.gpus_per_node IS '每节点 GPU 数';
COMMENT ON COLUMN train_job.gpu_count IS '总 GPU 卡数';
COMMENT ON COLUMN train_job.cpu_per_node IS '每节点 CPU 核';
COMMENT ON COLUMN train_job.mem_gi_per_node IS '每节点内存 GiB';
COMMENT ON COLUMN train_job.image IS '容器镜像';
COMMENT ON COLUMN train_job.command IS '启动命令';
COMMENT ON COLUMN train_job.env IS '用户环境变量 JSON 对象';
COMMENT ON COLUMN train_job.workdir IS '容器工作路径';
COMMENT ON COLUMN train_job.owner_user_id IS '运行用户 ID';
COMMENT ON COLUMN train_job.owner_username IS '运行用户账号';
COMMENT ON COLUMN train_job.owner_nickname IS '运行用户显示名';
COMMENT ON COLUMN train_job.submitted_by_user_id IS '提交人 ID';
COMMENT ON COLUMN train_job.submitted_by_username IS '提交人账号';
COMMENT ON COLUMN train_job.submitted_by_nickname IS '提交人显示名';
COMMENT ON COLUMN train_job.rerun_from_id IS '重跑源任务 ID';
COMMENT ON COLUMN train_job.fail_reason IS '失败原因';
COMMENT ON COLUMN train_job.config_mounts IS '配置挂载快照 JSON 数组';
COMMENT ON COLUMN train_job.pod_nodes IS '最近一次 Pod 节点名，逗号分隔';
COMMENT ON COLUMN train_job.sync_error IS '与 Volcano 同步失败说明';
COMMENT ON COLUMN train_job.started_at IS '开始运行时间';
COMMENT ON COLUMN train_job.ended_at IS '结束时间';
COMMENT ON COLUMN train_job.list_bucket IS '列表排序桶：0=排队中，1=其它';
COMMENT ON COLUMN train_job.priority_order IS '优先级排序：P0=0 P1=1 P2=2 P3=3';
COMMENT ON COLUMN train_job.created_at IS '创建时间';
COMMENT ON COLUMN train_job.updated_at IS '更新时间';
COMMENT ON COLUMN train_job.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_train_job_cluster_ns_name ON train_job (cluster_id, namespace, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_cluster_created ON train_job (cluster_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_cluster_status ON train_job (cluster_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_team ON train_job (team_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_queue ON train_job (queue_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_owner ON train_job (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_started ON train_job (queue_id, started_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_job_list_sort ON train_job (cluster_id, list_bucket, priority_order, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS train_config_set (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(64)  NOT NULL,
    display_name   VARCHAR(64)  NOT NULL,
    team_id        BIGINT       NOT NULL,
    framework      VARCHAR(32)  NOT NULL DEFAULT 'custom',
    visibility     VARCHAR(16)  NOT NULL DEFAULT 'team',
    status         VARCHAR(16)  NOT NULL DEFAULT 'active',
    owner_user_id  BIGINT       NOT NULL,
    owner_username VARCHAR(64)  NOT NULL,
    owner_nickname VARCHAR(128) NOT NULL DEFAULT '',
    description    VARCHAR(256) NOT NULL DEFAULT '',
    latest_version INT          NOT NULL DEFAULT 0,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    deleted_at     TIMESTAMP
);

COMMENT ON TABLE train_config_set IS '训练配置集';
COMMENT ON COLUMN train_config_set.id IS '配置集 ID';
COMMENT ON COLUMN train_config_set.name IS '由显示名称派生的稳定标识';
COMMENT ON COLUMN train_config_set.display_name IS '显示名称';
COMMENT ON COLUMN train_config_set.team_id IS '所属团队';
COMMENT ON COLUMN train_config_set.framework IS '框架：megatron / nemo / accelerate / custom';
COMMENT ON COLUMN train_config_set.visibility IS '可见性：team / private';
COMMENT ON COLUMN train_config_set.status IS '状态：active / archived';
COMMENT ON COLUMN train_config_set.owner_user_id IS '创建人 ID';
COMMENT ON COLUMN train_config_set.owner_username IS '创建人账号';
COMMENT ON COLUMN train_config_set.owner_nickname IS '创建人显示名';
COMMENT ON COLUMN train_config_set.description IS '描述';
COMMENT ON COLUMN train_config_set.latest_version IS '最新已发布版本号，0 表示尚无版本';
COMMENT ON COLUMN train_config_set.created_at IS '创建时间';
COMMENT ON COLUMN train_config_set.updated_at IS '更新时间';
COMMENT ON COLUMN train_config_set.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_train_config_team_name ON train_config_set (team_id, name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_train_config_team_display ON train_config_set (team_id, display_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_config_team ON train_config_set (team_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_config_owner ON train_config_set (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_train_config_status ON train_config_set (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS train_config_version (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    set_id          BIGINT       NOT NULL,
    version         INT          NOT NULL,
    message         VARCHAR(256) NOT NULL,
    author_user_id  BIGINT       NOT NULL,
    author_username VARCHAR(64)  NOT NULL,
    author_nickname VARCHAR(128) NOT NULL DEFAULT '',
    digest          VARCHAR(64)  NOT NULL DEFAULT '',
    files           JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

COMMENT ON TABLE train_config_version IS '配置集不可变版本';
COMMENT ON COLUMN train_config_version.id IS '版本行 ID';
COMMENT ON COLUMN train_config_version.set_id IS '配置集 ID';
COMMENT ON COLUMN train_config_version.version IS '版本号，从 1 递增';
COMMENT ON COLUMN train_config_version.message IS '版本说明';
COMMENT ON COLUMN train_config_version.author_user_id IS '发布人 ID';
COMMENT ON COLUMN train_config_version.author_username IS '发布人账号';
COMMENT ON COLUMN train_config_version.author_nickname IS '发布人显示名';
COMMENT ON COLUMN train_config_version.digest IS '文件内容摘要';
COMMENT ON COLUMN train_config_version.files IS '文件数组 JSON，含 path 与 content';
COMMENT ON COLUMN train_config_version.created_at IS '发布时间';
COMMENT ON COLUMN train_config_version.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_train_config_version ON train_config_version (set_id, version);
CREATE INDEX IF NOT EXISTS idx_train_config_version_set ON train_config_version (set_id, version DESC);

CREATE TABLE IF NOT EXISTS train_config_draft (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    set_id          BIGINT       NOT NULL,
    owner_user_id   BIGINT       NOT NULL,
    owner_username  VARCHAR(64)  NOT NULL,
    owner_nickname  VARCHAR(128) NOT NULL DEFAULT '',
    message         VARCHAR(256) NOT NULL DEFAULT '',
    files           JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

COMMENT ON TABLE train_config_draft IS '配置集个人草稿，每个配置集至多一条';
COMMENT ON COLUMN train_config_draft.id IS '草稿 ID';
COMMENT ON COLUMN train_config_draft.set_id IS '配置集 ID';
COMMENT ON COLUMN train_config_draft.owner_user_id IS '草稿所有人 ID';
COMMENT ON COLUMN train_config_draft.owner_username IS '草稿所有人账号';
COMMENT ON COLUMN train_config_draft.owner_nickname IS '草稿所有人显示名';
COMMENT ON COLUMN train_config_draft.message IS '拟发布版本说明';
COMMENT ON COLUMN train_config_draft.files IS '草稿文件 JSON 数组';
COMMENT ON COLUMN train_config_draft.created_at IS '创建时间';
COMMENT ON COLUMN train_config_draft.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_train_config_draft_set ON train_config_draft (set_id);
CREATE INDEX IF NOT EXISTS idx_train_config_draft_owner ON train_config_draft (owner_user_id);

-- 006：实验分析项目与 Run 初始化。

CREATE TABLE IF NOT EXISTS exp_project (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(64)  NOT NULL,
    display_name VARCHAR(64)  NOT NULL DEFAULT '',
    description  VARCHAR(256) NOT NULL DEFAULT '',
    archived     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    deleted_at   TIMESTAMP
);

COMMENT ON TABLE exp_project IS '实验项目，用于归类 Run；名称创建后只读';
COMMENT ON COLUMN exp_project.id IS '项目 ID';
COMMENT ON COLUMN exp_project.name IS '项目名称，创建后只读';
COMMENT ON COLUMN exp_project.display_name IS '显示名称';
COMMENT ON COLUMN exp_project.description IS '描述';
COMMENT ON COLUMN exp_project.archived IS '是否已归档';
COMMENT ON COLUMN exp_project.created_at IS '创建时间';
COMMENT ON COLUMN exp_project.updated_at IS '更新时间';
COMMENT ON COLUMN exp_project.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_exp_project_name_active ON exp_project (LOWER(name)) WHERE deleted_at IS NULL AND archived = FALSE;

CREATE TABLE IF NOT EXISTS exp_run (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                  VARCHAR(128)  NOT NULL,
    project_id            BIGINT        NOT NULL,
    cluster_id            BIGINT        NOT NULL,
    team_id               BIGINT        NOT NULL,
    team_name             VARCHAR(128)  NOT NULL DEFAULT '',
    job_id                BIGINT,
    tb_logdir             VARCHAR(512)  NOT NULL DEFAULT '',
    datacenter_code       VARCHAR(64)   NOT NULL DEFAULT '',
    owner_user_id         BIGINT        NOT NULL,
    owner_username        VARCHAR(64)   NOT NULL,
    owner_nickname        VARCHAR(128)  NOT NULL DEFAULT '',
    last_loss             DOUBLE PRECISION,
    last_step             BIGINT,
    max_steps             BIGINT,
    last_tokens_per_sec   DOUBLE PRECISION,
    metrics_at            TIMESTAMP,
    metrics_error         VARCHAR(256)  NOT NULL DEFAULT '',
    board_accessed_at     TIMESTAMP,
    board_error           VARCHAR(256)  NOT NULL DEFAULT '',
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP,
    deleted_at            TIMESTAMP
);

COMMENT ON TABLE exp_run IS '实验 Run，关联训练任务与 TensorBoard logdir，外层只存最新标量快照';
COMMENT ON COLUMN exp_run.id IS 'Run ID';
COMMENT ON COLUMN exp_run.name IS 'Run 名称，默认与任务名相同';
COMMENT ON COLUMN exp_run.project_id IS '所属项目 ID';
COMMENT ON COLUMN exp_run.cluster_id IS '工作集群 ID';
COMMENT ON COLUMN exp_run.team_id IS '所属团队 ID';
COMMENT ON COLUMN exp_run.team_name IS '团队名称快照';
COMMENT ON COLUMN exp_run.job_id IS '关联训练任务 ID';
COMMENT ON COLUMN exp_run.tb_logdir IS 'TensorBoard logdir';
COMMENT ON COLUMN exp_run.datacenter_code IS '任务机房标识';
COMMENT ON COLUMN exp_run.owner_user_id IS '创建人 ID';
COMMENT ON COLUMN exp_run.owner_username IS '创建人账号';
COMMENT ON COLUMN exp_run.owner_nickname IS '创建人显示名';
COMMENT ON COLUMN exp_run.last_loss IS '最新 train loss';
COMMENT ON COLUMN exp_run.last_step IS '最新 step';
COMMENT ON COLUMN exp_run.max_steps IS '进度分母，可空';
COMMENT ON COLUMN exp_run.last_tokens_per_sec IS '最新吞吐标量';
COMMENT ON COLUMN exp_run.metrics_at IS '最近一次成功读盘时间';
COMMENT ON COLUMN exp_run.metrics_error IS '最近一次读盘失败说明';
COMMENT ON COLUMN exp_run.board_accessed_at IS '最近一次打开看板时间';
COMMENT ON COLUMN exp_run.board_error IS '看板代理错误说明';
COMMENT ON COLUMN exp_run.created_at IS '创建时间';
COMMENT ON COLUMN exp_run.updated_at IS '更新时间';
COMMENT ON COLUMN exp_run.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_exp_run_job ON exp_run (job_id) WHERE deleted_at IS NULL AND job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exp_run_cluster_created ON exp_run (cluster_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exp_run_project ON exp_run (project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exp_run_team ON exp_run (team_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exp_run_owner ON exp_run (owner_username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exp_run_board_access ON exp_run (cluster_id, board_accessed_at DESC) WHERE deleted_at IS NULL AND board_accessed_at IS NOT NULL;

INSERT INTO exp_project (name, display_name, description, archived)
SELECT 'default', '默认项目', '任务自动关联的未分组项目', FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM exp_project WHERE name = 'default' AND deleted_at IS NULL
);

-- 项目管理改为软删除：已归档的非默认项目转为删除，默认项目保持可见。
UPDATE exp_project
SET deleted_at = COALESCE(deleted_at, NOW())
WHERE archived IS TRUE
  AND deleted_at IS NULL
  AND name <> 'default';

UPDATE exp_project
SET archived = FALSE
WHERE name = 'default'
  AND deleted_at IS NULL
  AND archived IS TRUE;

DROP INDEX IF EXISTS uk_exp_project_name_active;
CREATE UNIQUE INDEX IF NOT EXISTS uk_exp_project_name_active ON exp_project (LOWER(name)) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_exp_run_job;
CREATE UNIQUE INDEX IF NOT EXISTS uk_exp_run_job ON exp_run (job_id) WHERE job_id IS NOT NULL;

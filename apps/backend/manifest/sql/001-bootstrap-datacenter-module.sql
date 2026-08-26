-- 001：本地管理员认证与数据中心管理初始化。

CREATE TABLE IF NOT EXISTS sys_user (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username   VARCHAR(64)  NOT NULL,
    password   VARCHAR(256) NOT NULL,
    nickname   VARCHAR(64)  NOT NULL DEFAULT '',
    status     SMALLINT     NOT NULL DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

COMMENT ON TABLE sys_user IS '平台用户账号';
COMMENT ON COLUMN sys_user.id IS '用户 ID';
COMMENT ON COLUMN sys_user.username IS '登录用户名';
COMMENT ON COLUMN sys_user.password IS '密码哈希';
COMMENT ON COLUMN sys_user.nickname IS '显示名称';
COMMENT ON COLUMN sys_user.status IS '状态：1=启用 0=停用';
COMMENT ON COLUMN sys_user.created_at IS '创建时间';
COMMENT ON COLUMN sys_user.updated_at IS '更新时间';
COMMENT ON COLUMN sys_user.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_username ON sys_user (username) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sys_user_session (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    user_agent VARCHAR(512) NOT NULL DEFAULT '',
    ip_address VARCHAR(64)  NOT NULL DEFAULT '',
    expires_at TIMESTAMP    NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

COMMENT ON TABLE sys_user_session IS '服务端登录会话';
COMMENT ON COLUMN sys_user_session.id IS '会话 ID';
COMMENT ON COLUMN sys_user_session.user_id IS '用户 ID';
COMMENT ON COLUMN sys_user_session.token_hash IS '不透明会话令牌的 SHA-256 十六进制值';
COMMENT ON COLUMN sys_user_session.user_agent IS '登录时的 User-Agent';
COMMENT ON COLUMN sys_user_session.ip_address IS '登录时的客户端 IP';
COMMENT ON COLUMN sys_user_session.expires_at IS '会话过期时间';
COMMENT ON COLUMN sys_user_session.revoked_at IS '撤销时间';
COMMENT ON COLUMN sys_user_session.created_at IS '创建时间';
COMMENT ON COLUMN sys_user_session.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_session_token_hash ON sys_user_session (token_hash);
CREATE INDEX IF NOT EXISTS idx_sys_user_session_user_id ON sys_user_session (user_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_session_expires_at ON sys_user_session (expires_at);

CREATE TABLE IF NOT EXISTS ops_datacenter (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    short_name  VARCHAR(32)  NOT NULL,
    region      VARCHAR(64)  NOT NULL DEFAULT '',
    label_key   VARCHAR(128) NOT NULL DEFAULT 'maip.io/datacenter',
    color       VARCHAR(16)  NOT NULL DEFAULT '#3b82f6',
    description VARCHAR(512) NOT NULL DEFAULT '',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    deleted_at  TIMESTAMP
);

COMMENT ON TABLE ops_datacenter IS '供节点、队列与集群引用的数据中心登记表';
COMMENT ON COLUMN ops_datacenter.id IS '数据中心 ID';
COMMENT ON COLUMN ops_datacenter.code IS '不可变业务标识，作为 maip.io/datacenter 标签值';
COMMENT ON COLUMN ops_datacenter.name IS '显示名称';
COMMENT ON COLUMN ops_datacenter.short_name IS '列表角标使用的简称';
COMMENT ON COLUMN ops_datacenter.region IS '区域文本';
COMMENT ON COLUMN ops_datacenter.label_key IS 'Kubernetes 标签键，固定为 maip.io/datacenter';
COMMENT ON COLUMN ops_datacenter.color IS '角标颜色，格式 #RRGGBB';
COMMENT ON COLUMN ops_datacenter.description IS '说明';
COMMENT ON COLUMN ops_datacenter.enabled IS '新建资源是否可选该数据中心';
COMMENT ON COLUMN ops_datacenter.is_default IS '是否为内置默认数据中心';
COMMENT ON COLUMN ops_datacenter.created_at IS '创建时间';
COMMENT ON COLUMN ops_datacenter.updated_at IS '更新时间';
COMMENT ON COLUMN ops_datacenter.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_datacenter_code ON ops_datacenter (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_datacenter_is_default ON ops_datacenter (is_default) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ops_datacenter_enabled_created ON ops_datacenter (enabled, created_at);

INSERT INTO sys_user (username, password, nickname, status, created_at, updated_at)
SELECT 'admin', '$2a$10$6u4IIEd63chleDWJIY6.NewSU7YrpBQ0Tbp.KfLiG71NQrRlL9qTe', '平台管理员', 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM sys_user WHERE username = 'admin' AND deleted_at IS NULL
);

INSERT INTO ops_datacenter (code, name, short_name, region, label_key, color, description, enabled, is_default, created_at, updated_at)
SELECT
    'default',
    '默认数据中心',
    '默认',
    '',
    'maip.io/datacenter',
    '#64748b',
    '平台内置默认数据中心。无需额外配置即可用于任务提交、队列与节点关联；可按需新增区域数据中心。',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM ops_datacenter WHERE code = 'default' AND deleted_at IS NULL
);

UPDATE sys_user
SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE ops_datacenter
SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

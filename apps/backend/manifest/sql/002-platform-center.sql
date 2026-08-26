-- 002：平台中心（LDAP 身份、用户、角色、团队）初始化。

ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS email VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS department VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS title VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS role_code VARCHAR(32) NOT NULL DEFAULT '';
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'local';
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

COMMENT ON COLUMN sys_user.email IS '邮箱';
COMMENT ON COLUMN sys_user.department IS '部门，通常映射自 LDAP ou';
COMMENT ON COLUMN sys_user.title IS '职位';
COMMENT ON COLUMN sys_user.role_code IS '平台角色编码：algo / sre，本地管理员为空';
COMMENT ON COLUMN sys_user.source IS '账号来源：local=本地管理员 ldap=目录用户';
COMMENT ON COLUMN sys_user.last_login_at IS '最近登录时间';

CREATE INDEX IF NOT EXISTS idx_sys_user_source_status ON sys_user (source, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sys_user_role_code ON sys_user (role_code) WHERE deleted_at IS NULL AND role_code <> '';

UPDATE sys_user
SET
    source = 'local',
    email = CASE WHEN email = '' THEN 'admin@maip.local' ELSE email END,
    department = CASE WHEN department = '' THEN '系统内置' ELSE department END,
    title = CASE WHEN title = '' THEN '平台管理员' ELSE title END
WHERE username = 'admin' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sys_role (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(32)  NOT NULL,
    name        VARCHAR(32)  NOT NULL,
    description VARCHAR(256) NOT NULL DEFAULT '',
    menus       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    builtin     BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_by  VARCHAR(64)  NOT NULL DEFAULT '',
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

COMMENT ON TABLE sys_role IS '平台内置角色，菜单范围固定，允许改名';
COMMENT ON COLUMN sys_role.id IS '角色 ID';
COMMENT ON COLUMN sys_role.code IS '不可变角色编码：algo / sre';
COMMENT ON COLUMN sys_role.name IS '显示名称';
COMMENT ON COLUMN sys_role.description IS '说明';
COMMENT ON COLUMN sys_role.menus IS '侧栏菜单分区 JSON 数组，取值 training / ops / platform';
COMMENT ON COLUMN sys_role.builtin IS '是否内置角色';
COMMENT ON COLUMN sys_role.updated_by IS '最近改名操作者显示名';
COMMENT ON COLUMN sys_role.created_at IS '创建时间';
COMMENT ON COLUMN sys_role.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_role_code ON sys_role (code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_role_name ON sys_role (name);

CREATE TABLE IF NOT EXISTS sys_team (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL,
    description   VARCHAR(512) NOT NULL DEFAULT '',
    owner_user_id BIGINT       NOT NULL,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    deleted_at    TIMESTAMP
);

COMMENT ON TABLE sys_team IS '平台虚拟团队，用于成员归属，不同于公司组织架构';
COMMENT ON COLUMN sys_team.id IS '团队 ID';
COMMENT ON COLUMN sys_team.name IS '团队名称';
COMMENT ON COLUMN sys_team.description IS '描述';
COMMENT ON COLUMN sys_team.owner_user_id IS '负责人用户 ID';
COMMENT ON COLUMN sys_team.created_at IS '创建时间';
COMMENT ON COLUMN sys_team.updated_at IS '更新时间';
COMMENT ON COLUMN sys_team.deleted_at IS '删除时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_team_name ON sys_team (name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sys_team_owner_user_id ON sys_team (owner_user_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sys_team_member (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id    BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

COMMENT ON TABLE sys_team_member IS '团队与平台用户的多对多成员关系';
COMMENT ON COLUMN sys_team_member.id IS '成员关系 ID';
COMMENT ON COLUMN sys_team_member.team_id IS '团队 ID';
COMMENT ON COLUMN sys_team_member.user_id IS '用户 ID';
COMMENT ON COLUMN sys_team_member.created_at IS '加入时间';
COMMENT ON COLUMN sys_team_member.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_team_member_team_user ON sys_team_member (team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sys_team_member_user_id ON sys_team_member (user_id);

CREATE TABLE IF NOT EXISTS sys_ldap_config (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code               VARCHAR(32)  NOT NULL,
    name               VARCHAR(128) NOT NULL DEFAULT '',
    host               VARCHAR(256) NOT NULL DEFAULT '',
    port               INT          NOT NULL DEFAULT 389,
    use_tls            BOOLEAN      NOT NULL DEFAULT FALSE,
    base_dn            VARCHAR(512) NOT NULL DEFAULT '',
    bind_dn            VARCHAR(512) NOT NULL DEFAULT '',
    bind_password      VARCHAR(256) NOT NULL DEFAULT '',
    user_filter        VARCHAR(512) NOT NULL DEFAULT '',
    search_filter      VARCHAR(512) NOT NULL DEFAULT '',
    attr_username      VARCHAR(64)  NOT NULL DEFAULT 'uid',
    attr_name          VARCHAR(64)  NOT NULL DEFAULT 'cn',
    attr_email         VARCHAR(64)  NOT NULL DEFAULT 'mail',
    attr_department    VARCHAR(64)  NOT NULL DEFAULT 'ou',
    attr_title         VARCHAR(64)  NOT NULL DEFAULT 'title',
    timeout_sec        INT          NOT NULL DEFAULT 10,
    last_test_at       TIMESTAMP,
    last_test_result   VARCHAR(16)  NOT NULL DEFAULT '',
    last_test_message  VARCHAR(512) NOT NULL DEFAULT '',
    updated_by         VARCHAR(64)  NOT NULL DEFAULT '',
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);

COMMENT ON TABLE sys_ldap_config IS '平台级 LDAP 连接配置，仅保留一行业务键 default';
COMMENT ON COLUMN sys_ldap_config.id IS '配置 ID';
COMMENT ON COLUMN sys_ldap_config.code IS '业务键，固定为 default';
COMMENT ON COLUMN sys_ldap_config.name IS '配置名称';
COMMENT ON COLUMN sys_ldap_config.host IS 'LDAP 主机';
COMMENT ON COLUMN sys_ldap_config.port IS 'LDAP 端口';
COMMENT ON COLUMN sys_ldap_config.use_tls IS '是否使用 LDAPS';
COMMENT ON COLUMN sys_ldap_config.base_dn IS '检索 Base DN';
COMMENT ON COLUMN sys_ldap_config.bind_dn IS '服务账号 Bind DN';
COMMENT ON COLUMN sys_ldap_config.bind_password IS '服务账号绑定密码，接口响应不得返回明文';
COMMENT ON COLUMN sys_ldap_config.user_filter IS '用户认证 Filter，{username} 替换为登录账号';
COMMENT ON COLUMN sys_ldap_config.search_filter IS '目录搜索 Filter，{q} 替换为关键词';
COMMENT ON COLUMN sys_ldap_config.attr_username IS '账号属性名';
COMMENT ON COLUMN sys_ldap_config.attr_name IS '姓名属性名';
COMMENT ON COLUMN sys_ldap_config.attr_email IS '邮箱属性名';
COMMENT ON COLUMN sys_ldap_config.attr_department IS '部门属性名';
COMMENT ON COLUMN sys_ldap_config.attr_title IS '职位属性名';
COMMENT ON COLUMN sys_ldap_config.timeout_sec IS '连接超时秒数';
COMMENT ON COLUMN sys_ldap_config.last_test_at IS '最近一次测试时间';
COMMENT ON COLUMN sys_ldap_config.last_test_result IS '最近测试结果：success / fail，空表示尚未测试';
COMMENT ON COLUMN sys_ldap_config.last_test_message IS '最近测试说明';
COMMENT ON COLUMN sys_ldap_config.updated_by IS '最近保存者显示名';
COMMENT ON COLUMN sys_ldap_config.created_at IS '创建时间';
COMMENT ON COLUMN sys_ldap_config.updated_at IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_ldap_config_code ON sys_ldap_config (code);

INSERT INTO sys_role (code, name, description, menus, builtin, updated_by, created_at, updated_at)
SELECT 'algo', '算法工程师', '算法研发与训练任务提交', '["training"]'::jsonb, TRUE, '系统', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'algo');

INSERT INTO sys_role (code, name, description, menus, builtin, updated_by, created_at, updated_at)
SELECT 'sre', 'SRE工程师', '集群运维、节点与队列管理', '["training", "ops"]'::jsonb, TRUE, '系统', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'sre');

INSERT INTO sys_ldap_config (
    code, name, host, port, use_tls, base_dn, bind_dn, bind_password,
    user_filter, search_filter, attr_username, attr_name, attr_email, attr_department, attr_title,
    timeout_sec, created_at, updated_at
)
SELECT
    'default',
    '本地模拟 LDAP',
    '127.0.0.1',
    1389,
    FALSE,
    'dc=msxf,dc=com',
    'cn=admin,dc=msxf,dc=com',
    'admin',
    '(&(objectClass=inetOrgPerson)(uid={username}))',
    '(|(uid=*{q}*)(cn=*{q}*)(mail=*{q}*))',
    'uid',
    'cn',
    'mail',
    'ou',
    'title',
    10,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_ldap_config WHERE code = 'default');

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'algo', '', '算法工程师', 'algo@msxf.com', '人工智能中心 / 算法', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'algo' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'sre', '', 'SRE工程师', 'sre@msxf.com', '基础架构 / SRE', 'SRE工程师', 'sre', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'sre' AND deleted_at IS NULL);

UPDATE sys_role
SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE sys_ldap_config
SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE sys_user
SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

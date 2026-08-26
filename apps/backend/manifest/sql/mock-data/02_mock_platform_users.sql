-- 可选的原型 LDAP 平台用户，仅用于本地演示。algo / sre 由 002 种子写入。

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'guoqiang', '', '郭强', 'guoqiang@msxf.com', '人工智能中心 / SLM', '人工智能全干工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'guoqiang' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'wujialing', '', '伍佳灵', 'wujialing@msxf.com', '人工智能中心 / SLM', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'wujialing' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'liyunbin', '', '李云彬', 'liyunbin@msxf.com', '人工智能中心 / 研究组', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'liyunbin' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'zhaohaiyang', '', '赵海洋', 'zhaohaiyang@msxf.com', '人工智能中心 / 研究组', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'zhaohaiyang' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'hanweiqiang', '', '韩卫强', 'hanweiqiang@msxf.com', '人工智能中心 / 数据组', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'hanweiqiang' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'linhaili', '', '林海立', 'linhaili@msxf.com', '人工智能中心 / SLM', '算法工程师', 'algo', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'linhaili' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'xuetong', '', '薛童', 'xuetong@msxf.com', '基础架构 / SRE', '运维工程师', 'sre', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'xuetong' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'wangzhendong', '', '王振东', 'wangzhendong@msxf.com', '人工智能中心', '平台管理员', 'sre', 'ldap', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'wangzhendong' AND deleted_at IS NULL);

INSERT INTO sys_user (username, password, nickname, email, department, title, role_code, source, status, created_at, updated_at)
SELECT 'xiongyunchuan', '', '熊云川', 'xiongyunchuan@msxf.com', '人工智能中心 / NLP', '算法工程师', 'algo', 'ldap', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'xiongyunchuan' AND deleted_at IS NULL);

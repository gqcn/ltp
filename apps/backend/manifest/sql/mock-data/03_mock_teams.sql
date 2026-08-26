-- 可选的原型团队与成员关系，仅用于本地演示。

INSERT INTO sys_team (name, description, owner_user_id, created_at, updated_at)
SELECT 'SLM预训练', '小模型预训练主线，绑定疆算 / 两江 H100 队列', u.id, NOW(), NOW()
FROM sys_user u
WHERE u.username = 'guoqiang' AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_team t WHERE t.name = 'SLM预训练' AND t.deleted_at IS NULL);

INSERT INTO sys_team (name, description, owner_user_id, created_at, updated_at)
SELECT '算法研究', '研究组共享资源与 debug 队列', u.id, NOW(), NOW()
FROM sys_user u
WHERE u.username = 'liyunbin' AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_team t WHERE t.name = '算法研究' AND t.deleted_at IS NULL);

INSERT INTO sys_team (name, description, owner_user_id, created_at, updated_at)
SELECT 'SFT微调', '指令微调与对齐实验', u.id, NOW(), NOW()
FROM sys_user u
WHERE u.username = 'guoqiang' AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_team t WHERE t.name = 'SFT微调' AND t.deleted_at IS NULL);

INSERT INTO sys_team (name, description, owner_user_id, created_at, updated_at)
SELECT '数据工程', '数据清洗、tokenize、校验任务', u.id, NOW(), NOW()
FROM sys_user u
WHERE u.username = 'hanweiqiang' AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_team t WHERE t.name = '数据工程' AND t.deleted_at IS NULL);

INSERT INTO sys_team_member (team_id, user_id, created_at, updated_at)
SELECT t.id, u.id, NOW(), NOW()
FROM sys_team t
JOIN sys_user u ON u.deleted_at IS NULL
WHERE t.deleted_at IS NULL
  AND (
        (t.name = 'SLM预训练' AND u.username IN ('guoqiang', 'wujialing', 'linhaili', 'algo'))
     OR (t.name = '算法研究' AND u.username IN ('liyunbin', 'zhaohaiyang', 'guoqiang', 'algo'))
     OR (t.name = 'SFT微调' AND u.username IN ('guoqiang', 'wujialing'))
     OR (t.name = '数据工程' AND u.username IN ('hanweiqiang', 'linhaili'))
  )
  AND NOT EXISTS (
      SELECT 1 FROM sys_team_member m WHERE m.team_id = t.id AND m.user_id = u.id
  );

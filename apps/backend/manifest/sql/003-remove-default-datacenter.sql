-- 003：移除内置默认数据中心。节点未配置时保持未分配，不回落 default。

UPDATE ops_datacenter
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE code = 'default'
  AND is_default IS TRUE
  AND deleted_at IS NULL;

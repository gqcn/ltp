-- 可选的原型数据中心，仅用于本地演示。

INSERT INTO ops_datacenter (code, name, short_name, region, label_key, color, description, enabled, is_default, created_at, updated_at)
SELECT 'cq-lj', '重庆两江', '两江', '重庆', 'maip.io/datacenter', '#3b82f6', '两江数据中心 · 主训练资源区，IB NDR', TRUE, FALSE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM ops_datacenter WHERE code = 'cq-lj' AND deleted_at IS NULL
);

INSERT INTO ops_datacenter (code, name, short_name, region, label_key, color, description, enabled, is_default, created_at, updated_at)
SELECT 'cq-st', '重庆水土', '水土', '重庆', 'maip.io/datacenter', '#22d3ee', '水土数据中心 · 部分无 IB 节点池', TRUE, FALSE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM ops_datacenter WHERE code = 'cq-st' AND deleted_at IS NULL
);

INSERT INTO ops_datacenter (code, name, short_name, region, label_key, color, description, enabled, is_default, created_at, updated_at)
SELECT 'xj-js', '疆算', '疆算', '新疆', 'maip.io/datacenter', '#a78bfa', '疆算数据中心 · 大规模 H100 / B300 训练', TRUE, FALSE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM ops_datacenter WHERE code = 'xj-js' AND deleted_at IS NULL
);

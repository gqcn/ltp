import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  createDatacenter,
  deleteDatacenter,
  listDatacenters,
  updateDatacenter,
  updateDatacenterStatus,
  type Datacenter,
  type DatacenterWriteInput,
} from "@/api/datacenter";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ColorField } from "@/components/ColorField";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";

type StatusFilter = "all" | "enabled" | "disabled";
type FormState = DatacenterWriteInput & { code: string };
type PendingAction = { type: "enable" | "disable" | "delete"; item: Datacenter };

const emptyForm: FormState = {
  code: "",
  name: "",
  shortName: "",
  region: "",
  color: "#3b82f6",
  description: "",
};

export function DatacenterPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Datacenter | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!formOpen) {
      return;
    }
    const fieldId = editing ? "dc-form-name" : "dc-form-id";
    const timer = window.setTimeout(() => {
      const field = document.getElementById(fieldId);
      const active = document.activeElement;
      if (field && (!active || !field.closest(".modal")?.contains(active))) {
        field.focus();
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [formOpen, editing]);

  const enabledFilter = status === "all" ? undefined : status === "enabled";
  const listQuery = useQuery({
    queryKey: ["datacenters", { keyword, enabledFilter, page, pageSize }],
    queryFn: () =>
      listDatacenters({
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        enabled: enabledFilter,
      }),
  });

  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const kpis = listQuery.data?.summary ?? { total: 0, enabled: 0, disabled: 0 };

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["datacenters"] });
  }

  const createMutation = useMutation({
    mutationFn: () => createDatacenter(form),
    onSuccess: async () => {
      toast.success(`已创建数据中心 ${form.name}（${form.code}）`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const updateMutation = useMutation({
    mutationFn: () => updateDatacenter(editing!.id, form),
    onSuccess: async () => {
      toast.success(`已保存数据中心 ${form.name}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const statusMutation = useMutation({
    mutationFn: () => updateDatacenterStatus(pending!.item.id, pending!.type === "enable"),
    onSuccess: async () => {
      if (pending?.type === "enable") {
        toast.success(`已启用数据中心 ${pending.item.name}`);
      } else {
        toast.warning(`已停用数据中心 ${pending?.item.name}`);
      }
      setPending(null);
      await invalidate();
    },
    onError: showError,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteDatacenter(pending!.item.id),
    onSuccess: async () => {
      toast.warning(`已删除数据中心 ${pending?.item.name}`);
      setPending(null);
      await invalidate();
    },
    onError: showError,
  });

  function showError(error: unknown) {
    const message = error instanceof ApiError ? error.message : "操作失败";
    setFormError(message);
    toast.error(message);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: Datacenter) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      shortName: item.shortName,
      region: item.region === "—" ? "" : item.region,
      color: item.color,
      description: item.description,
    });
    setFormError("");
    setFormOpen(true);
  }

  function submitForm() {
    setFormError("");
    const code = form.code.trim();
    const name = form.name.trim();
    const shortName = form.shortName.trim();
    if (!code || !name || !shortName) {
      setFormError("请填写数据中心标识、显示名称与简称");
      return;
    }
    if (!editing && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(code)) {
      setFormError("数据中心标识仅支持小写字母、数字与连字符，且不能以连字符开头/结尾");
      return;
    }
    if (editing) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  }

  function confirmPending() {
    if (!pending) {
      return;
    }
    if (pending.type === "delete") {
      deleteMutation.mutate();
      return;
    }
    statusMutation.mutate();
  }

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>数据中心管理</h1>
          <p className="desc">
            维护数据中心标识与元数据 · 供节点 label、队列额度、集群覆盖等业务关联 · 节点未配置时保持未分配 · 节点 label 约定{" "}
            <span className="mono">maip.io/datacenter</span>
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={openCreate}>+ 新建数据中心</Button>
        </div>
      </div>

      <div className="stats-grid stats-grid-3 fault-kpi-row">
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--primary)" }}>
          <div className="stat-label">数据中心总数</div>
          <div className="stat-value">{kpis.total}</div>
        </div>
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--success)" }}>
          <div className="stat-label">已启用</div>
          <div className="stat-value text-success">{kpis.enabled}</div>
        </div>
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--text-3)" }}>
          <div className="stat-label">已停用</div>
          <div className="stat-value" style={{ color: "var(--text-3)" }}>
            {kpis.disabled}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            placeholder="搜索标识 / 名称 / 区域..."
            value={keyword}
            onChange={(event) => {
              setPage(1);
              setKeyword(event.target.value);
            }}
          />
        </div>
        <select
          className="filter-select"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as StatusFilter);
          }}
        >
          <option value="all">全部状态</option>
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>数据中心列表</h3>
          <span className="text-muted" style={{ fontSize: 12 }}>
            标识用于节点 / 队列 / 集群关联 · 节点未配置数据中心时保持未分配 · Label Key 固定为 maip.io/datacenter
          </span>
        </div>
        <div className="card-body flush">
          {listQuery.isError ? (
            <div className="empty-state">数据中心列表加载失败</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">暂无数据中心，点击「新建数据中心」添加</div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>数据中心</th>
                      <th>标识</th>
                      <th>区域</th>
                      <th>Label</th>
                      <th>关联</th>
                      <th>状态</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id} className={item.enabled ? undefined : "is-disabled-row"}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="dc-badge" style={{ ["--dc-color" as string]: item.color }}>
                              {item.shortName}
                            </span>
                            <div>
                              <strong>{item.name}</strong>{" "}
                              {item.description ? (
                                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2, maxWidth: 220, lineHeight: 1.4 }}>
                                  {item.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ fontWeight: 600, color: "var(--text-0)" }}>
                          {item.code}
                        </td>
                        <td>{item.region || "—"}</td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {item.label}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span title="节点">{item.usage.nodes} 节点</span>
                          <span className="text-muted"> · </span>
                          <span title="队列">{item.usage.queues} 队列</span>
                          <span className="text-muted"> · </span>
                          <span title="集群">{item.usage.clusters} 集群</span>
                        </td>
                        <td>
                          {item.enabled ? (
                            <span className="badge badge-healthy">启用</span>
                          ) : (
                            <span className="badge badge-muted">停用</span>
                          )}
                        </td>
                        <td className="td-actions">
                          <div className="job-actions">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant={item.enabled ? "secondary" : "primary"}
                              onClick={() => setPending({ type: item.enabled ? "disable" : "enable", item })}
                            >
                              {item.enabled ? "停用" : "启用"}
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setPending({ type: "delete", item })}>
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "编辑数据中心" : "新建数据中心"}
        confirmText={editing ? "保存" : "创建数据中心"}
        maxWidth={560}
        onClose={() => setFormOpen(false)}
        onConfirm={submitForm}
        confirmDisabled={createMutation.isPending || updateMutation.isPending}
      >
        <p className="modal-lead">
          数据中心标识将作为节点 Label 值（<span className="mono">maip.io/datacenter=&lt;标识&gt;</span>
          ），并被队列、节点、集群等模块引用。创建后标识不可修改。节点未配置该标签时保持未分配，不会回落到默认数据中心。
        </p>
        <div className="form-grid">
          <div className="form-group">
            <div className="field-label-row">
              <label htmlFor="dc-form-id">
                数据中心标识 <span className="req">*</span>
              </label>
              {editing ? <span className="field-lock-hint">创建后不可改</span> : null}
            </div>
            <input
              id="dc-form-id"
              className="mono"
              placeholder="例如 cq-lj、xj-js"
              autoComplete="off"
              value={form.code}
              readOnly={Boolean(editing)}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dc-form-name">
              显示名称 <span className="req">*</span>
            </label>
            <input
              id="dc-form-name"
              placeholder="例如 重庆两江"
              autoComplete="off"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dc-form-short">
              简称 <span className="req">*</span>
            </label>
            <input
              id="dc-form-short"
              placeholder="例如 两江（列表角标）"
              autoComplete="off"
              value={form.shortName}
              onChange={(event) => setForm((prev) => ({ ...prev, shortName: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dc-form-region">区域</label>
            <input
              id="dc-form-region"
              placeholder="例如 重庆 / 新疆"
              autoComplete="off"
              value={form.region}
              onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <div className="field-label-row">
              <label htmlFor="dc-form-label-key">Label Key</label>
              <span className="field-lock-hint">平台固定，不可修改</span>
            </div>
            <input id="dc-form-label-key" className="mono" value="maip.io/datacenter" readOnly tabIndex={-1} autoComplete="off" />
          </div>
          <div className="form-group full">
            <label htmlFor="dc-form-color">展示色</label>
            <ColorField
              key={formOpen ? (editing ? `edit-${editing.id}` : "create") : "closed"}
              id="dc-form-color"
              value={form.color}
              onChange={(color) => setForm((prev) => ({ ...prev, color }))}
            />
          </div>
          <div className="form-group full">
            <label>Label 预览</label>
            <div
              className="mono text-muted"
              style={{ fontSize: 12.5, padding: "8px 10px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}
            >
              maip.io/datacenter={form.code || "<标识>"}
            </div>
          </div>
          <div className="form-group full">
            <label htmlFor="dc-form-desc">说明</label>
            <textarea
              id="dc-form-desc"
              rows={2}
              placeholder="数据中心用途、网络与存储说明（可选）"
              style={{ minHeight: 64, width: "100%", resize: "vertical" }}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          {formError ? (
            <div className="form-group full">
              <p className="text-muted" style={{ fontSize: 12.5, color: "var(--danger)", margin: 0 }}>
                {formError}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(pending)}
        title={pending?.type === "delete" ? "确认删除数据中心" : pending?.type === "enable" ? "确认启用数据中心" : "确认停用数据中心"}
        confirmText={pending?.type === "delete" ? "确认删除" : pending?.type === "enable" ? "确认启用" : "确认停用"}
        confirmVariant={pending?.type === "enable" ? "primary" : "danger"}
        modalClassName="modal-confirm"
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
      >
        {pending ? (
          <>
            <p className="modal-msg">
              确定要{pending.type === "delete" ? "删除" : pending.type === "enable" ? "启用" : "停用"}数据中心{" "}
              <strong>{pending.item.name}</strong> 吗？
            </p>
            <p className="modal-meta">
              {[pending.item.code, pending.item.label, `${pending.item.usage.nodes} 节点 · ${pending.item.usage.queues} 队列 · ${pending.item.usage.clusters} 集群`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p
              className={
                pending.type === "enable" ? "modal-hint is-success" : pending.type === "disable" ? "modal-hint is-warning" : "modal-hint is-danger"
              }
            >
              {pending.type === "enable"
                ? "启用后，新建队列等场景可再次选择该数据中心。"
                : pending.type === "disable"
                  ? "停用后，新建队列等场景将不可再选择该数据中心；已有节点 / 队列关联不受影响。"
                  : pending.item.usage.nodes + pending.item.usage.queues + pending.item.usage.clusters > 0
                    ? `当前关联 ${pending.item.usage.nodes} 节点 / ${pending.item.usage.queues} 队列 / ${pending.item.usage.clusters} 集群。存在关联时不可删除，不会改挂到默认数据中心。`
                    : "删除后不可恢复。"}
            </p>
          </>
        ) : null}
      </Modal>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { listDatacenters } from "@/api/datacenter";
import { createQueue, deleteQueue, listQueues, previewQueueCapacity, syncQueue, updateQueue, updateQueueStatus, type CapacityPreview, type Queue, type QueueWrite } from "@/api/queue";
import { listTeams } from "@/api/team";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody, ListLoading } from "@/components/ListLoading";
import { FieldError, FieldHelp } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { errText, focusField, groupClass, invalidProps, LINE_MAX, useZodForm, zLine, zNonNegative, zRequired, zTextOpt, zVolcanoQueueName } from "@/lib/form";
import { DcBadge, QuotaMini } from "@/components/UsageCell";
import { quotaBarClass } from "@/lib/resources";
import { useWorkingCluster } from "@/lib/useWorkingCluster";
import { formatGpuHours } from "@/lib/job";
import { toast } from "@/lib/toast";

const emptyForm: QueueWrite & { name: string } = {
  name: "",
  displayName: "",
  datacenterCode: "",
  gpuType: "",
  gpuQuota: 1,
  cpuQuota: 1,
  memQuotaGi: 1,
  teamIds: [],
  features: [],
  weight: 1,
  reclaimable: true,
  description: "",
};

function queueSchema(editing: boolean) {
  return z.object({
    name: editing ? z.string() : zVolcanoQueueName(),
    displayName: zLine("请填写显示名称"),
    datacenterCode: zRequired("请选择数据中心"),
    gpuType: zRequired("请选择 GPU 型号"),
    gpuQuota: zNonNegative("额度不能为负数"),
    cpuQuota: zNonNegative("额度不能为负数"),
    memQuotaGi: zNonNegative("额度不能为负数"),
    teamIds: z.array(z.number()).min(1, "请至少关联一个团队"),
    features: z.array(z.string()),
    weight: z.coerce.number(),
    reclaimable: z.boolean(),
    description: zTextOpt(),
  });
}

type QueueForm = z.infer<ReturnType<typeof queueSchema>>;

export function QueuePage() {
  const queryClient = useQueryClient();
  const { clusterId, clusters, loading: clustersLoading } = useWorkingCluster();
  const [keyword, setKeyword] = useState("");
  const [dc, setDc] = useState("all");
  const [gpuType, setGpuType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Queue | null>(null);
  const [formError, setFormError] = useState("");
  const schema = useMemo(() => queueSchema(Boolean(editing)), [editing]);
  const methods = useZodForm(schema, { defaultValues: emptyForm });
  const form = methods.watch();
  const nameError = errText(methods.formState.errors, "name");
  const displayError = errText(methods.formState.errors, "displayName");
  const teamError = errText(methods.formState.errors, "teamIds");
  const dcError = errText(methods.formState.errors, "datacenterCode");
  const gpuError = errText(methods.formState.errors, "gpuType");
  const gpuQuotaError = errText(methods.formState.errors, "gpuQuota");
  const cpuError = errText(methods.formState.errors, "cpuQuota");
  const memError = errText(methods.formState.errors, "memQuotaGi");
  const descError = errText(methods.formState.errors, "description");
  const [teamQuery, setTeamQuery] = useState("");
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [teamMap, setTeamMap] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<{ type: "enable" | "disable" | "delete" | "blocked"; item: Queue } | null>(null);

  const dcQuery = useQuery({ queryKey: ["datacenters", { pageNum: 1, pageSize: 100 }], queryFn: () => listDatacenters({ pageNum: 1, pageSize: 100 }) });
  const teamSearch = useQuery({
    queryKey: ["teams", "queue-picker", teamQuery],
    queryFn: () => listTeams({ pageNum: 1, pageSize: 20, keyword: teamQuery.trim() || undefined }),
    enabled: formOpen,
  });
  const listQuery = useQuery({
    queryKey: ["queues", { clusterId, keyword, dc, gpuType, status, page, pageSize }],
    queryFn: () =>
      listQueues({
        clusterId: clusterId!,
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        datacenterCode: dc === "all" ? undefined : dc,
        gpuType: gpuType === "all" ? undefined : gpuType,
        enabled: status === "all" ? undefined : status === "enabled",
      }),
    enabled: Boolean(clusterId),
  });
  const capQuery = useQuery({
    queryKey: ["queue-capacity", clusterId, form.datacenterCode, form.features, editing?.id],
    queryFn: () => previewQueueCapacity({ clusterId: clusterId!, datacenterCode: form.datacenterCode, features: form.features, excludeQueueId: editing?.id }),
    enabled: formOpen && Boolean(clusterId && form.datacenterCode),
  });
  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const dcs = dcQuery.data?.list ?? [];
  const enabledDcs = dcs;
  const dcMap = useMemo(() => Object.fromEntries(dcs.map((item) => [item.code, item])), [dcs]);
  const gpuOptions = useMemo(
    () => gpuOptionsFor(capQuery.data, form.features, editing ? form.gpuType : ""),
    [capQuery.data, form.features, editing, form.gpuType],
  );
  const gpuOptionKey = gpuOptions.map((o) => o.type).join("|");
  const firstDcCode = enabledDcs[0]?.code || "";
  useEffect(() => {
    if (!formOpen) return;
    if (!form.datacenterCode && firstDcCode) {
      methods.setValue("datacenterCode", firstDcCode);
      return;
    }
    const types = gpuOptionKey ? gpuOptionKey.split("|") : [];
    if (!types.length) {
      if (form.gpuType) {
        methods.setValue("gpuType", "");
      }
      return;
    }
    if (!types.includes(form.gpuType)) {
      methods.setValue("gpuType", types[0]);
    }
  }, [formOpen, gpuOptionKey, form.gpuType, form.datacenterCode, firstDcCode, methods]);

  function invalidate() {
    return Promise.all([queryClient.invalidateQueries({ queryKey: ["queues"] }), queryClient.invalidateQueries({ queryKey: ["clusters"] }), queryClient.invalidateQueries({ queryKey: ["datacenters"] })]);
  }
  function showError(error: unknown) {
    const message = error instanceof ApiError ? error.message : "操作失败";
    setFormError(message);
    toast.error(message);
  }

  const saveMutation = useMutation({
    mutationFn: async (input: QueueForm) => {
      if (editing) {
        await updateQueue(editing.id, input);
        return;
      }
      await createQueue({ ...input, clusterId: clusterId! });
    },
    onSuccess: async (_, input) => {
      toast.success(editing ? `队列已更新: ${input.displayName}` : `队列已创建: ${input.displayName}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const submitForm = methods.handleSubmit((input) => {
    setFormError("");
    if (capQuery.data) {
      const issues = quotaOverRemain(capQuery.data, input);
      if (issues.length) {
        issues.forEach((issue) => methods.setError(issue.field, { type: "manual", message: issue.message }));
        focusField(issues[0].id);
        return;
      }
    }
    saveMutation.mutate(input);
  });
  const statusMutation = useMutation({
    mutationFn: () => updateQueueStatus(pending!.item.id, pending!.type === "enable"),
    onSuccess: async () => {
      toast.success(pending?.type === "enable" ? "已启用队列" : "已禁用队列");
      setPending(null);
      await invalidate();
    },
    onError: showError,
  });
  const syncMutation = useMutation({
    mutationFn: (id: number) => syncQueue(id),
    onSuccess: async (_, id) => {
      const name = rows.find((q) => q.id === id)?.displayName || "队列";
      toast.success(`已重新同步 Volcano Queue：${name}`);
      await invalidate();
    },
    onError: showError,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteQueue(pending!.item.id),
    onSuccess: async () => {
      toast.warning(`已删除队列 ${pending?.item.displayName}`);
      setPending(null);
      await invalidate();
    },
    onError: (error) => {
      if (pending?.type === "delete" && error instanceof ApiError && error.errorCode === "QUEUE_BUSY") {
        setPending({ type: "blocked", item: pending.item });
        return;
      }
      showError(error);
    },
  });

  if (clustersLoading) {
    return (
      <section className="page active" id="page-queue-mgmt">
        <div className="page-header">
          <div>
            <h1>队列管理</h1>
            <p className="desc">按数据中心与卡型号配置资源队列</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body flush">
            <ListLoading label="正在加载队列…" />
          </div>
        </div>
      </section>
    );
  }

  if (!clusters.length) {
    return (
      <section className="page active" id="page-queue-mgmt">
        <div className="page-header">
          <div>
            <h1>队列管理</h1>
            <p className="desc">请先接入 Kubernetes 集群</p>
          </div>
        </div>
        <div className="empty-state">暂无工作集群</div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-queue-mgmt">
      <div className="page-header">
        <div>
          <h1>队列管理</h1>
          <p className="desc">按数据中心与卡型号配置资源队列 · 可关联多个团队 · 设置功能特性与额度 · 支持启用 / 禁用 / 删除</p>
        </div>
        <div className="page-actions">
          <Button
            onClick={() => {
              setEditing(null);
              methods.reset({ ...emptyForm, datacenterCode: enabledDcs[0]?.code || "" });
              setTeamMap({});
              setTeamQuery("");
              setTeamPickerOpen(false);
              setFormError("");
              setFormOpen(true);
            }}
          >
            + 新建队列
          </Button>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            value={keyword}
            placeholder="搜索队列 / 团队..."
            onChange={(e) => {
              setPage(1);
              setKeyword(e.target.value);
            }}
          />
        </div>
        <select
          className="filter-select"
          value={dc}
          onChange={(e) => {
            setPage(1);
            setDc(e.target.value);
          }}
        >
          <option value="all">全部数据中心</option>
          {enabledDcs.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={gpuType}
          onChange={(e) => {
            setPage(1);
            setGpuType(e.target.value);
          }}
        >
          <option value="all">全部卡型号</option>
          {[...new Set(rows.map((q) => q.gpuType).filter(Boolean))].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label="按状态筛选"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="all">全部状态</option>
          <option value="enabled">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </div>
      <div className="card">
        <div className="card-body flush">
          <ListBody
            loading={listQuery.isLoading}
            error={listQuery.isError}
            empty={rows.length === 0}
            loadingLabel="正在加载队列…"
            errorLabel="队列列表加载失败"
            emptyLabel="没有匹配的队列"
          >
            <>
              <div className="table-wrap">
                <table className="table queue-list-table">
                  <thead>
                    <tr>
                      <th>队列</th>
                      <th>团队</th>
                      <th>数据中心</th>
                      <th>GPU</th>
                      <th>本月卡时</th>
                      <th>额度（已用 / 总量）</th>
                      <th>功能特性</th>
                      <th>状态</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((q) => {
                      const dcItem = dcMap[q.datacenterCode];
                      return (
                        <tr key={q.id} className={q.enabled ? undefined : "is-disabled-row"}>
                          <td>
                            <strong>{q.displayName}</strong>
                            <div className="mono text-muted" style={{ fontSize: 11 }}>
                              {q.name}
                            </div>
                            {q.description ? <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{q.description}</div> : null}
                            {q.syncError ? <div className="text-warning" style={{ fontSize: 11 }}>{q.syncError}</div> : null}
                          </td>
                          <td className="td-queue-teams">
                            {q.teams.length ? (
                              <div className="queue-team-tags" title={q.teams.map((t) => t.name).join("、")}>
                                {q.teams.map((t) => (
                                  <span key={t.id} className="tag tag-soft">
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <DcBadge code={q.datacenterCode} name={dcItem?.name} shortName={dcItem?.shortName} color={dcItem?.color} />
                          </td>
                          <td className="td-gpu-type">
                            <span className="gpu-type-text" title={q.gpuType}>
                              {q.gpuType || "—"}
                            </span>
                          </td>
                          <td className="td-queue-hours">
                            <strong>{formatGpuHours(q.gpuHoursMonth)}</strong>
                            <span className="text-muted"> 卡时</span>
                          </td>
                          <td className="td-queue-quota">
                            <div className="queue-quota-mini-list">
                              <QuotaMini label="GPU" used={q.gpuUsed} total={q.gpuQuota} unit="卡" />
                              <QuotaMini label="CPU" used={q.cpuUsed} total={q.cpuQuota} unit="核" />
                              <QuotaMini label="内存" used={q.memUsedGi} total={q.memQuotaGi} unit="Gi" />
                            </div>
                          </td>
                          <td>
                            {q.features.includes("ib") ? (
                              <span className="tag queue-feat-tag is-ib" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                                IB
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className={q.enabled ? "badge badge-healthy" : "badge badge-cancelled"}>{q.enabled ? "启用" : "禁用"}</span>
                          </td>
                          <td className="td-actions">
                            <div className="job-actions job-actions-stack">
                              <div className="job-actions-row">
                                <Button size="sm" variant="secondary" onClick={() => openEdit(q)}>
                                  编辑
                                </Button>
                                {q.syncError ? (
                                  <Button size="sm" variant="primary" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate(q.id)}>
                                    重新同步
                                  </Button>
                                ) : null}
                              </div>
                              <div className="job-actions-row">
                                <Button size="sm" variant={q.enabled ? "secondary" : "primary"} onClick={() => setPending({ type: q.enabled ? "disable" : "enable", item: q })}>
                                  {q.enabled ? "禁用" : "启用"}
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => openDelete(q)}>
                                  删除
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          </ListBody>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "编辑队列" : "新建队列"}
        confirmText={editing ? "保存" : "创建队列"}
        modalClassName="modal-queue-form"
        onClose={() => setFormOpen(false)}
        onConfirm={submitForm}
      >
        <p className="modal-lead text-muted">逻辑队列将同步创建底层 Volcano Queue。先选定数据中心与功能特性，再按特性筛选可用 GPU 型号并配置额度。</p>
        <div className="form-grid">
          <div className={groupClass(nameError)}>
            <div className="field-label-row">
              <label htmlFor="q-form-name">
                队列标识 {editing ? null : <span className="req">*</span>}
              </label>
              {editing ? <span className="field-lock-hint">创建后不可改</span> : null}
            </div>
            <input
              id="q-form-name"
              disabled={Boolean(editing)}
              placeholder="例如 slm-jiangsu-h100"
              autoComplete="off"
              maxLength={63}
              {...methods.register("name")}
              {...invalidProps("q-form-name", nameError)}
            />
            <FieldError id="q-form-name-error">{nameError}</FieldError>
          </div>
          <div className={groupClass(displayError)}>
            <label htmlFor="q-form-display">
              显示名称 <span className="req">*</span>
            </label>
            <input
              id="q-form-display"
              placeholder="例如 SLM · 疆算 H100"
              autoComplete="off"
              maxLength={LINE_MAX}
              {...methods.register("displayName")}
              {...invalidProps("q-form-display", displayError)}
            />
            <FieldError id="q-form-display-error">{displayError}</FieldError>
          </div>
          <div className={groupClass(teamError, "full")}>
            <div className="field-label-row">
              <label htmlFor="q-form-team-search">
                关联团队 <span className="req">*</span>
              </label>
              <FieldHelp tip="一个队列可关联多个团队。关联后，这些团队的成员提交任务时均可选择该队列。" label="关联团队说明" />
            </div>
            <div className="user-picker" id="q-team-picker">
              <div className="user-picker-control">
                <span className="user-picker-icon" aria-hidden="true" />
                <Controller
                  name="teamIds"
                  control={methods.control}
                  render={({ field }) => (
                    <input
                      id="q-form-team-search"
                      ref={field.ref}
                      value={teamQuery}
                      placeholder="搜索并添加团队..."
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-controls="q-team-results"
                      {...invalidProps("q-form-team-search", teamError)}
                      onChange={(e) => {
                        setTeamQuery(e.target.value);
                        setTeamPickerOpen(true);
                        if (teamError) {
                          methods.clearErrors("teamIds");
                        }
                      }}
                      onFocus={() => setTeamPickerOpen(true)}
                      onBlur={() => window.setTimeout(() => setTeamPickerOpen(false), 120)}
                    />
                  )}
                />
              </div>
              {form.teamIds.length ? (
                <div className="queue-team-chips" id="q-team-selected">
                  {form.teamIds.map((id) => (
                    <span key={id} className="queue-team-chip">
                      <span className="queue-team-chip-name" title={teamMap[id] || String(id)}>
                        {teamMap[id] || id}
                      </span>
                      <button
                        type="button"
                        className="queue-team-chip-remove"
                        aria-label={`移除 ${teamMap[id] || id}`}
                        onClick={() => {
                          methods.setValue(
                            "teamIds",
                            form.teamIds.filter((x) => x !== id),
                            { shouldValidate: true, shouldDirty: true },
                          );
                          setTeamMap((cur) => {
                            const next = { ...cur };
                            delete next[id];
                            return next;
                          });
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className={teamPickerOpen ? "user-picker-dropdown" : "user-picker-dropdown hidden"} id="q-team-results" role="listbox">
                {(teamSearch.data?.list ?? []).filter((t) => !form.teamIds.includes(t.id)).length === 0 ? (
                  <div className="user-picker-empty">{form.teamIds.length ? "已添加全部匹配团队" : "无匹配团队，请先在「团队管理」中创建"}</div>
                ) : (
                  (teamSearch.data?.list ?? [])
                    .filter((t) => !form.teamIds.includes(t.id))
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="user-picker-item"
                        role="option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          methods.setValue("teamIds", [...form.teamIds, t.id], { shouldValidate: true, shouldDirty: true });
                          setTeamMap((cur) => ({ ...cur, [t.id]: t.name }));
                          setTeamQuery("");
                          setTeamPickerOpen(false);
                        }}
                      >
                        <span className="user-picker-item-avatar">{(t.name || "?").slice(0, 1)}</span>
                        <span className="user-picker-item-body">
                          <span className="user-picker-item-line">
                            <strong>{t.name}</strong>
                            <span className="text-muted">{t.memberCount} 成员</span>
                          </span>
                          <span className="user-picker-item-sub text-muted">
                            {t.description || "—"}
                            {t.owner?.nickname ? ` · 负责人 ${t.owner.nickname}` : ""}
                          </span>
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>
            <FieldError id="q-form-team-search-error">{teamError}</FieldError>
          </div>
          <div className="form-group full">
            <div className="queue-form-section-label">资源筛选</div>
          </div>
          <div className={groupClass(dcError, "full")}>
            <label htmlFor="q-form-dc">
              数据中心 <span className="req">*</span>
            </label>
            <select
              id="q-form-dc"
              {...methods.register("datacenterCode")}
              {...invalidProps("q-form-dc", dcError)}
            >
              {enabledDcs.length ? null : <option value="">请先创建数据中心</option>}
              {enabledDcs.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}（{item.code}）
                </option>
              ))}
            </select>
            <FieldError id="q-form-dc-error">{dcError}</FieldError>
          </div>
          <div className="form-group full">
            <div className="field-label-row">
              <label>功能特性</label>
              <FieldHelp tip="功能特性用于前置过滤 GPU 型号，并写入队列配置。未选时展示该数据中心全部型号。" label="功能特性说明" />
            </div>
            <div className="queue-feature-filter" role="group" aria-label="功能特性">
              <label className="checkbox-inline queue-feature-option">
                <input type="checkbox" checked={form.features.includes("ib")} onChange={(e) => methods.setValue("features", e.target.checked ? ["ib"] : [], { shouldDirty: true })} />
                <span className="queue-feature-check-text">
                  <span className="queue-feature-check-title">支持 IB</span>
                  <span className="queue-feature-check-desc">InfiniBand · 多机 RDMA · 过滤具备 IB 的卡型号</span>
                </span>
              </label>
            </div>
          </div>
          <div className={groupClass(gpuError, "full")}>
            <label htmlFor="q-form-gpu">
              GPU 型号 <span className="req">*</span>
            </label>
            <select
              id="q-form-gpu"
              disabled={!gpuOptions.length}
              {...methods.register("gpuType")}
              {...invalidProps("q-form-gpu", gpuError)}
            >
              {!gpuOptions.length ? <option value="">请选择 GPU 型号</option> : null}
              {gpuOptions.map((o) => (
                <option key={o.type} value={o.type}>
                  {o.hasIB ? `${o.type} · IB` : o.type}
                </option>
              ))}
            </select>
            <p className={`queue-gpu-filter-hint text-muted ${!gpuOptions.length ? "is-warn" : ""}`} aria-live="polite">
              {gpuHint(form.features, gpuOptions.length)}
            </p>
            <FieldError id="q-form-gpu-error">{gpuError}</FieldError>
          </div>
          <div className="form-group full">
            <div id="q-form-capacity-hint" className="queue-capacity-hint" aria-live="polite">
              <CapacityPanel data={capQuery.data} dcName={dcMap[form.datacenterCode]?.name || form.datacenterCode} features={form.features} selectedGpu={form.gpuType} />
            </div>
          </div>
          <div className="form-group full">
            <div className="queue-form-section-label">额度配置</div>
          </div>
          <div className="form-grid cols-3 full queue-quota-row">
            <div className={groupClass(gpuQuotaError)}>
              <label htmlFor="q-form-gpu-quota">
                GPU 卡额度 <span className="req">*</span>
              </label>
              <input
                id="q-form-gpu-quota"
                type="number"
                min={0}
                placeholder="例如 256"
                {...methods.register("gpuQuota", { valueAsNumber: true })}
                {...invalidProps("q-form-gpu-quota", gpuQuotaError)}
              />
              <FieldError id="q-form-gpu-quota-error">{gpuQuotaError}</FieldError>
            </div>
            <div className={groupClass(cpuError)}>
              <label htmlFor="q-form-cpu">CPU 核额度</label>
              <input
                id="q-form-cpu"
                type="number"
                min={0}
                placeholder="例如 4096"
                {...methods.register("cpuQuota", { valueAsNumber: true })}
                {...invalidProps("q-form-cpu", cpuError)}
              />
              <FieldError id="q-form-cpu-error">{cpuError}</FieldError>
            </div>
            <div className={groupClass(memError)}>
              <label htmlFor="q-form-mem">内存额度 (Gi)</label>
              <input
                id="q-form-mem"
                type="number"
                min={0}
                placeholder="例如 32768"
                {...methods.register("memQuotaGi", { valueAsNumber: true })}
                {...invalidProps("q-form-mem", memError)}
              />
              <FieldError id="q-form-mem-error">{memError}</FieldError>
            </div>
          </div>
          <div className={groupClass(descError, "full")}>
            <label htmlFor="q-form-desc">描述</label>
            <textarea id="q-form-desc" rows={2} placeholder="额度说明，如：SLM 团队疆算 32×H100" style={{ minHeight: 56, width: "100%", resize: "vertical" }} {...methods.register("description")} {...invalidProps("q-form-desc", descError)} />
            <FieldError id="q-form-desc-error">{descError}</FieldError>
          </div>
        </div>
        {formError ? (
          <div id="q-form-error" className="login-error" role="alert" style={{ marginTop: 8 }}>
            {formError}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pending)}
        title={queueActionTitle(pending?.type)}
        confirmText={pending?.type === "delete" ? "确认删除" : pending?.type === "enable" ? "确认启用" : "确认禁用"}
        confirmVariant={pending?.type === "enable" ? "primary" : "danger"}
        confirmHidden={pending?.type === "blocked"}
        cancelText={pending?.type === "blocked" ? "知道了" : "取消"}
        modalClassName="modal-confirm"
        onClose={() => setPending(null)}
        onConfirm={pending?.type === "blocked" ? undefined : () => (pending?.type === "delete" ? deleteMutation.mutate() : statusMutation.mutate())}
      >
        <p className="modal-msg">
          {pending?.type === "blocked" ? (
            <>
              队列 <strong>{pending.item.displayName}</strong> 仍有 {queueBusyPhrase(pending.item)}的任务，暂不可删除。
            </>
          ) : (
            <>
              确定要{pending?.type === "delete" ? "删除" : pending?.type === "enable" ? "启用" : "禁用"}队列 <strong>{pending?.item.displayName}</strong> 吗？
            </>
          )}
        </p>
        <p className="modal-meta">
          {[pending?.item.name, pending?.item.teams.map((t) => t.name).join("、") || "—", pending?.item.datacenterCode, pending?.item.gpuType].filter(Boolean).join(" · ")}
        </p>
        <p className={`modal-hint ${queueHintClass(pending?.type)}`}>
          {pending?.type === "blocked"
            ? "请等待任务结束，或先停止相关任务后再删除。"
            : pending?.type === "delete"
              ? "团队关联将解除。已结束任务的历史记录会保留。此操作不可撤销。"
              : pending?.type === "enable"
                ? "启用后，该队列将重新出现在新建任务的队列选择列表中，团队成员可再次提交任务。"
                : "禁用后，新建任务将不可再选择该队列。运行中的任务不受影响；排队中的任务将无法被调度，需要手动终止。可随时重新启用。"}
        </p>
      </Modal>
    </section>
  );

  function openEdit(q: Queue) {
    setEditing(q);
    methods.reset({
      name: q.name,
      displayName: q.displayName,
      datacenterCode: q.datacenterCode,
      gpuType: q.gpuType,
      gpuQuota: q.gpuQuota,
      cpuQuota: q.cpuQuota,
      memQuotaGi: q.memQuotaGi,
      teamIds: q.teams.map((t) => t.id),
      features: q.features,
      weight: q.weight,
      reclaimable: q.reclaimable,
      description: q.description,
    });
    setTeamMap(Object.fromEntries(q.teams.map((t) => [t.id, t.name])));
    setTeamQuery("");
    setTeamPickerOpen(false);
    setFormError("");
    setFormOpen(true);
  }

  function openDelete(q: Queue) {
    if ((q.running || 0) + (q.pending || 0) > 0) {
      setPending({ type: "blocked", item: q });
      return;
    }
    setPending({ type: "delete", item: q });
  }
}

function gpuOptionsFor(data: CapacityPreview | undefined, features: string[], currentType = "") {
  let list = (data?.gpuTypes ?? []).filter((g) => g.type && g.type !== "cpu");
  if (features.includes("ib")) {
    list = list.filter((g) => g.hasIB);
  }
  const current = currentType.trim();
  if (current && current !== "cpu" && !list.some((g) => g.type === current)) {
    list = [{ type: current, total: 0, allocated: 0, hasIB: false }, ...list];
  }
  return list;
}

function quotaOverRemain(cap: CapacityPreview, input: QueueForm) {
  const issues: { field: "gpuQuota" | "cpuQuota" | "memQuotaGi"; id: string; message: string }[] = [];
  const gpu = cap.gpuTypes.find((g) => g.type === input.gpuType);
  const gpuRemain = Math.max(0, (gpu?.total ?? 0) - (gpu?.allocated ?? 0));
  const cpuRemain = Math.max(0, cap.cpuTotal - cap.cpuAllocated);
  const memRemain = Math.max(0, cap.memTotalGi - cap.memAllocated);
  if ((input.gpuQuota || 0) > gpuRemain) {
    issues.push({ field: "gpuQuota", id: "q-form-gpu-quota", message: `GPU 额度超过剩余容量（剩余 ${gpuRemain} 卡）` });
  }
  if ((input.cpuQuota || 0) > cpuRemain) {
    issues.push({ field: "cpuQuota", id: "q-form-cpu", message: `CPU 额度超过剩余容量（剩余 ${cpuRemain} 核）` });
  }
  if ((input.memQuotaGi || 0) > memRemain) {
    issues.push({ field: "memQuotaGi", id: "q-form-mem", message: `内存额度超过剩余容量（剩余 ${memRemain} Gi）` });
  }
  return issues;
}

function gpuHint(features: string[], count: number) {
  if (!count) {
    return features.includes("ib") ? "当前数据中心没有同时满足「支持 IB」的 GPU 型号，可调整筛选。" : "当前数据中心暂无可用 GPU 型号。";
  }
  return features.includes("ib") ? `已按功能特性「支持 IB」筛选，共 ${count} 种型号` : `未选功能特性，展示该数据中心全部型号，共 ${count} 种`;
}

function queueActionTitle(type?: string) {
  if (type === "blocked") return "无法删除队列";
  if (type === "delete") return "确认删除队列";
  if (type === "enable") return "确认启用队列";
  if (type === "disable") return "确认禁用队列";
  return "确认操作";
}

function queueHintClass(type?: string) {
  if (type === "enable") return "is-success";
  if (type === "disable") return "is-warning";
  return "is-danger";
}

function queueBusyPhrase(item: Queue) {
  const bits: string[] = [];
  if (item.running) bits.push(`${item.running} 个运行中`);
  if (item.pending) bits.push(`${item.pending} 个排队中`);
  return bits.join("、") || `${(item.running || 0) + (item.pending || 0)} 个`;
}

function CapacityPanel({
  data,
  dcName,
  features,
  selectedGpu,
}: {
  data?: CapacityPreview;
  dcName: string;
  features: string[];
  selectedGpu: string;
}) {
  if (!dcName) return null;
  const featLabel = features.includes("ib") ? "支持 IB" : "";
  if (!data || !data.gpuTypes.length) {
    return (
      <div className="queue-capacity-panel is-empty">
        <div className="queue-capacity-panel-title">资源分配预览 · {dcName}</div>
        <div className="text-warning" style={{ fontSize: 12.5 }}>
          {featLabel ? `当前筛选条件下无匹配「${featLabel}」的资源池，请调整数据中心或功能特性。` : "该数据中心暂无可用资源池。"}
        </div>
      </div>
    );
  }
  const gpuTypes = features.includes("ib") ? data.gpuTypes.filter((g) => g.hasIB) : data.gpuTypes;
  if (!gpuTypes.length) {
    return (
      <div className="queue-capacity-panel is-empty">
        <div className="queue-capacity-panel-title">资源分配预览 · {dcName}</div>
        <div className="text-warning" style={{ fontSize: 12.5 }}>
          当前筛选条件下无匹配「{featLabel}」的资源池，请调整数据中心或功能特性。
        </div>
      </div>
    );
  }
  return (
    <div className="queue-capacity-panel">
      <div className="queue-capacity-panel-head">
        <div className="queue-capacity-panel-title-row">
          <div className="queue-capacity-panel-title">
            资源分配预览 · {dcName}
            {featLabel ? ` · ${featLabel}` : ""}
          </div>
          <div className="queue-capacity-panel-meta text-muted">{gpuTypes.length} 种卡型号</div>
        </div>
        <div className="queue-capacity-panel-caption">卡型号为各型号 GPU 资源池；CPU / 内存为当前筛选条件下的合计。已分配为各队列额度之和（不含当前队列）</div>
      </div>
      <div className="queue-capacity-section-label">卡型号</div>
      <div className="queue-capacity-gpu-list">
        {gpuTypes.map((g) => (
          <div key={g.type} className={g.type === selectedGpu ? "queue-capacity-gpu-row is-active" : "queue-capacity-gpu-row"}>
            <div className="queue-capacity-gpu-head">
              <span className="queue-capacity-gpu-name">
                {g.type}
                {g.hasIB ? <span className="queue-cap-feat-tag is-ib">IB</span> : <span className="queue-cap-feat-tag is-muted">无 IB</span>}
              </span>
            </div>
            <AllocMeter label="GPU" total={g.total} allocated={g.allocated} unit="卡" />
          </div>
        ))}
      </div>
      <div className="queue-capacity-section-label">CPU / 内存</div>
      <div className="queue-capacity-cpumem">
        <AllocMeter label="CPU" total={data.cpuTotal} allocated={data.cpuAllocated} unit="核" />
        <AllocMeter label="内存" total={data.memTotalGi} allocated={data.memAllocated} unit="Gi" />
      </div>
    </div>
  );
}

function AllocMeter({ label, total, allocated, unit }: { label: string; total: number; allocated: number; unit?: string }) {
  const remain = Math.max(0, total - allocated);
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0;
  const tone = quotaBarClass(pct);
  const fill = tone === "is-danger" ? "danger" : tone === "is-warn" ? "warn" : "success";
  const pctColor = fill === "danger" ? "text-danger" : fill === "warn" ? "text-warning" : "text-success";
  const fmt = (n: number) => `${n}${unit ? ` ${unit}` : ""}`;
  return (
    <div className="queue-capacity-meter">
      <div className="queue-capacity-bar-label">
        <span>{label}</span>
        <span className="mono queue-capacity-gpu-nums">
          总共 <strong>{fmt(total)}</strong>
          · 已分配 <strong>{fmt(allocated)}</strong>
          · 剩余可分配 <strong className={remain ? "text-success" : "text-danger"}>{fmt(remain)}</strong>
          · <strong className={pctColor}>{pct}%</strong>
        </span>
      </div>
      <div className="capacity-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} 已分配 ${pct}%`}>
        <div className={`capacity-fill ${fill}`} style={{ width: `${pct}%` }} title={`已分配 ${fmt(allocated)} / ${fmt(total)}（${pct}%）`} />
      </div>
    </div>
  );
}

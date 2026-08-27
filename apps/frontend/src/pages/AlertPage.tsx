import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { batchUpdateAlertStatus, getAlert, listAlerts, updateAlertStatus, type AlertItem } from "@/api/alert";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody, ListLoading } from "@/components/ListLoading";
import { FieldError } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { formatTime } from "@/lib/format";
import { errText, groupClass, invalidProps, useZodForm, zText } from "@/lib/form";
import { toast } from "@/lib/toast";

const handleSchema = z.object({
  remark: zText("请填写处理备注"),
});

const SEVS = ["all", "critical", "warning", "info"];
const STATUSES = ["all", "open", "following", "handled"];
const RANGES = ["all", "1h", "6h", "24h", "7d", "30d"];

export function AlertPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [handleIds, setHandleIds] = useState<number[] | null>(null);
  const [handleStatus, setHandleStatus] = useState("handled");
  const handleForm = useZodForm(handleSchema, { defaultValues: { remark: "" } });
  const remarkError = errText(handleForm.formState.errors, "remark");
  const [detailId, setDetailId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["alerts", { sev, status, range, keyword, page, pageSize }],
    queryFn: () =>
      listAlerts({
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        severity: sev,
        status,
        range,
      }),
  });
  const detailQuery = useQuery({
    queryKey: ["alert", detailId],
    queryFn: () => getAlert(detailId!),
    enabled: Boolean(detailId),
  });
  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const kpis = listQuery.data?.summary ?? { total: 0, open: 0, following: 0, handled: 0, critical: 0, warning: 0, info: 0, unfinished: 0 };
  const allChecked = rows.length > 0 && rows.every((a) => selected.includes(a.id));
  const handleTargets = handleIds ? rows.filter((a) => handleIds.includes(a.id)) : [];

  function invalidate() {
    return Promise.all([queryClient.invalidateQueries({ queryKey: ["alerts"] }), queryClient.invalidateQueries({ queryKey: ["alert-summary"] })]);
  }

  const handleMutation = useMutation({
    mutationFn: (remark: string) =>
      handleIds && handleIds.length === 1
        ? updateAlertStatus(handleIds[0], handleStatus, remark)
        : batchUpdateAlertStatus(handleIds ?? [], handleStatus, remark),
    onSuccess: async () => {
      toast.success("已更新告警状态");
      setHandleIds(null);
      setSelected([]);
      handleForm.reset({ remark: "" });
      await invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "处理失败"),
  });

  const submitHandle = handleForm.handleSubmit((values) => {
    handleMutation.mutate(values.remark);
  });

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>告警中心</h1>
          <p className="desc">来自 FastX Webhook · {rangeLabel(range)} · 支持批量处理</p>
        </div>
      </div>
      <div className="alert-kpi-row">
        <div className="alert-kpi">
          <div className="alert-kpi-label">待处理</div>
          <div className="alert-kpi-value is-warn">
            {kpis.open}
            <span> 条</span>
          </div>
        </div>
        <div className="alert-kpi">
          <div className="alert-kpi-label">跟进中</div>
          <div className="alert-kpi-value is-follow">
            {kpis.following}
            <span> 条</span>
          </div>
        </div>
        <div className="alert-kpi">
          <div className="alert-kpi-label">已完成</div>
          <div className="alert-kpi-value is-ok">
            {kpis.handled}
            <span> 条</span>
          </div>
        </div>
        <div className="alert-kpi">
          <div className="alert-kpi-label">严重</div>
          <div className="alert-kpi-value is-crit">
            {kpis.critical}
            <span> 条</span>
          </div>
        </div>
      </div>
      <div className="alert-filter-bar">
        <ChipGroup label="级别" value={sev} options={SEVS} onChange={(v) => { setPage(1); setSev(v); }} />
        <ChipGroup label="状态" value={status} options={STATUSES} onChange={(v) => { setPage(1); setStatus(v); }} />
        <ChipGroup label="时间" value={range} options={RANGES} onChange={(v) => { setPage(1); setRange(v); }} />
        <div className="alert-filter-search">
          <div className="search-box" style={{ maxWidth: "none", flex: 1 }}>
            <span className="search-icon">⌕</span>
            <input value={keyword} placeholder="按标题 / 节点 / 指标搜索..." onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        {selected.length ? (
          <div className="node-batch-bar">
            <span className="node-batch-count">已选 {selected.length} 条</span>
            <div className="node-batch-actions">
              <Button size="sm" onClick={() => openHandle(selected)}>
                处理告警
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                取消选择
              </Button>
            </div>
          </div>
        ) : null}
        <div className="alerts-list-head">
          <label className="alerts-check-all">
            <input type="checkbox" title="全选当前页" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? rows.map((a) => a.id) : [])} />
            <span>全选当前页</span>
          </label>
        </div>
        <div className="card-body flush" id="alerts-list">
          <ListBody
            loading={listQuery.isLoading}
            error={listQuery.isError}
            empty={rows.length === 0}
            loadingLabel="正在加载告警…"
            errorLabel="告警列表加载失败"
            emptyLabel="没有匹配的告警"
          >
            {rows.map((a) => (
              <div key={a.id} className={selected.includes(a.id) ? "alert-item is-selected" : "alert-item"}>
                <label className="alert-item-check">
                  <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} aria-label={`选择告警 ${alertIdText(a)}`} />
                </label>
                <div className={`alert-sev ${a.severity}`} />
                <div className="alert-body">
                  <div className="flex-center gap-8" style={{ justifyContent: "space-between", flexWrap: "wrap", marginBottom: 6 }}>
                    <div className="alert-title">
                      <span className="alert-id">
                        <span className="alert-id-k">ID:</span> {alertIdText(a)}
                      </span>
                      <span>{a.title}</span>
                      <span className={sevBadgeClass(a.severity)}>{chipLabel(a.severity)}</span>
                      <span className={statusBadgeClass(a.status)}>{chipLabel(a.status)}</span>
                    </div>
                    <span className="mono text-muted" style={{ fontSize: 11 }}>
                      {formatTime(a.firstAlarmAt || a.createdAt)}
                    </span>
                  </div>
                  <div className="alert-desc">
                    <div className="alert-field">
                      <span className="alert-field-k">告警信息</span>
                      <span>{a.alertInfo || "—"}</span>
                    </div>
                    {a.faultInfo ? (
                      <div className="alert-field">
                        <span className="alert-field-k">故障信息</span>
                        <span className="text-warning">{a.faultInfo}</span>
                      </div>
                    ) : null}
                    {a.handleRemark ? (
                      <div className="alert-field">
                        <span className="alert-field-k">处理信息</span>
                        <span>
                          {a.handleRemark}
                          {a.handledBy ? <span className="text-muted"> · {a.handledBy}</span> : null}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="alert-tags">
                    <span className="tag">{a.source}</span>
                    {a.nodeNames ? <span className="tag">node={a.nodeNames}</span> : null}
                    {a.faultInfo ? (
                      <span className="tag" style={{ background: "var(--warning-soft)", color: "#fbbf24" }}>
                        含故障信息
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-8 flex gap-8" style={{ flexWrap: "wrap" }}>
                    <Button size="sm" onClick={() => openHandle([a.id])}>
                      处理告警
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(a.id)}>
                      查看详情
                    </Button>
                    {a.faultInfo && singleNode(a) ? (
                      <Button size="sm" variant="danger" onClick={() => navigate("/ops/nodes")}>
                        处理节点
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </ListBody>
          {listQuery.isLoading || listQuery.isError || rows.length === 0 ? null : (
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </div>
      </div>

      <Modal
        open={Boolean(handleIds)}
        title={handleIds && handleIds.length > 1 ? "批量处理告警" : "处理告警"}
        confirmText={handleIds && handleIds.length > 1 ? `确认处理 ${handleIds.length} 条` : "确认处理"}
        modalClassName="modal-alert-handle"
        onClose={() => {
          setHandleIds(null);
          handleForm.clearErrors();
        }}
        onConfirm={submitHandle}
      >
        <p className="modal-msg">
          {handleIds && handleIds.length > 1 ? (
            <>
              将以相同状态与备注处理选中的 <strong>{handleIds.length}</strong> 条告警
            </>
          ) : (
            <>
              处理告警 <strong>{handleTargets[0]?.title || ""}</strong>
            </>
          )}
        </p>
        {handleIds && handleIds.length > 1 ? (
          <div className="alert-handle-targets">
            {handleTargets.slice(0, 8).map((a) => (
              <span key={a.id} className="alert-handle-chip">
                <span className="mono">ID: {alertIdText(a)}</span>
                <span className="alert-handle-chip-title">{a.title || "—"}</span>
              </span>
            ))}
            {handleTargets.length > 8 ? (
              <span className="text-muted" style={{ fontSize: 12 }}>
                +{handleTargets.length - 8} 条
              </span>
            ) : null}
          </div>
        ) : handleTargets[0] ? (
          <p className="modal-meta">ID: {alertIdText(handleTargets[0])}</p>
        ) : null}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>
            处理状态 <span className="req">*</span>
          </label>
          <div className="alert-handle-options" role="radiogroup" aria-label="处理状态">
            <label className={handleStatus === "following" ? "alert-handle-option is-active" : "alert-handle-option"}>
              <input type="radio" name="alert-handle-status" checked={handleStatus === "following"} onChange={() => setHandleStatus("following")} />
              <span className="alert-handle-option-title">处理中</span>
              <span className="alert-handle-option-desc">状态更新为跟进中</span>
            </label>
            <label className={handleStatus === "handled" ? "alert-handle-option is-active" : "alert-handle-option"}>
              <input type="radio" name="alert-handle-status" checked={handleStatus === "handled"} onChange={() => setHandleStatus("handled")} />
              <span className="alert-handle-option-title">已完成</span>
              <span className="alert-handle-option-desc">平台侧已处理完毕</span>
            </label>
          </div>
        </div>
        <div className={groupClass(remarkError)} style={{ marginTop: 14 }}>
          <label htmlFor="modal-alert-handle-remark">
            处理备注 <span className="req">*</span>
          </label>
          <textarea
            id="modal-alert-handle-remark"
            rows={3}
            placeholder="填写处理说明，例如已隔离节点、已转交硬件维修…"
            style={{ minHeight: 84 }}
            {...handleForm.register("remark")}
            {...invalidProps("modal-alert-handle-remark", remarkError)}
          />
          <FieldError id="modal-alert-handle-remark-error">{remarkError}</FieldError>
        </div>
      </Modal>

      <Modal open={Boolean(detailId)} title="告警详情" modalClassName="modal-alert-detail" cancelText="关闭" confirmHidden onClose={() => setDetailId(null)}>
        {detailQuery.data ? (
          <>
            <div className="alert-detail-hero">
              <div className="alert-detail-name">{detailQuery.data.title}</div>
              <div className="alert-detail-badges">
                <span className={sevBadgeClass(detailQuery.data.severity)}>{chipLabel(detailQuery.data.severity)}</span>
                <span className={statusBadgeClass(detailQuery.data.status)}>{chipLabel(detailQuery.data.status)}</span>
              </div>
            </div>
            <div className="kv-grid">
              <div className="kv-item">
                <span className="k">ID</span>
                <span className="v mono">{alertIdText(detailQuery.data)}</span>
              </div>
              <div className="kv-item">
                <span className="k">触发时间</span>
                <span className="v mono">{formatTime(detailQuery.data.firstAlarmAt || detailQuery.data.createdAt)}</span>
              </div>
              <div className="kv-item">
                <span className="k">数据源</span>
                <span className="v">{detailQuery.data.source || "—"}</span>
              </div>
              <div className="kv-item">
                <span className="k">节点</span>
                <span className="v mono">{detailQuery.data.nodeNames || "—"}</span>
              </div>
              <div className="kv-item full">
                <span className="k">告警信息</span>
                <span className="v">{detailQuery.data.alertInfo || "—"}</span>
              </div>
              {detailQuery.data.faultInfo ? (
                <div className="kv-item full">
                  <span className="k">故障信息</span>
                  <span className="v text-warning">{detailQuery.data.faultInfo}</span>
                </div>
              ) : null}
              <div className="kv-item full">
                <span className="k">处理信息</span>
                <span className="v">
                  {detailQuery.data.handleRemark || detailQuery.data.handledAt ? (
                    <>
                      {detailQuery.data.handleRemark || "—"}
                      {detailQuery.data.handledBy || detailQuery.data.handledAt ? (
                        <span className="text-muted">
                          {" "}
                          · {[detailQuery.data.handledBy, formatTime(detailQuery.data.handledAt)].filter((v) => v && v !== "—").join(" · ")}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted">尚未填写处理备注</span>
                  )}
                </span>
              </div>
            </div>
            <div className="alert-raw-block">
              <div className="alert-raw-head">
                <div>
                  <div className="alert-raw-title">原始告警内容</div>
                  <p className="alert-raw-hint">FastX 通过 Webhook 提交到平台的原始 JSON</p>
                </div>
              </div>
              <pre className="code-block is-hl alert-raw-json" data-lang="json">
                {pretty(detailQuery.data.webhookPayload)}
              </pre>
            </div>
          </>
        ) : (
          <ListLoading label="正在加载告警详情…" />
        )}
      </Modal>
    </section>
  );

  function toggle(id: number) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function openHandle(ids: number[]) {
    const targets = rows.filter((a) => ids.includes(a.id));
    const statuses = [...new Set(targets.map((a) => a.status))];
    setHandleIds(ids);
    setHandleStatus(statuses.length === 1 && statuses[0] === "handled" ? "handled" : "following");
    handleForm.reset({ remark: ids.length === 1 ? targets[0]?.handleRemark || "" : "" });
  }
}

function ChipGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="alert-filter-group">
      <span className="alert-filter-label">{label}</span>
      <div className="alert-chip-group">
        {options.map((opt) => (
          <button key={opt} type="button" className={value === opt ? "alert-chip active" : "alert-chip"} onClick={() => onChange(opt)}>
            {chipLabel(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

function chipLabel(v: string) {
  const map: Record<string, string> = {
    all: "全部",
    critical: "严重",
    warning: "警告",
    info: "提示",
    open: "待处理",
    following: "跟进中",
    handled: "已完成",
    "1h": "1h",
    "6h": "6h",
    "24h": "24h",
    "7d": "7d",
    "30d": "30d",
  };
  return map[v] || v;
}

function rangeLabel(v: string) {
  if (v === "all") return "全部时间";
  return `最近 ${chipLabel(v)}`;
}

function sevBadgeClass(v: string) {
  if (v === "critical") return "badge badge-critical";
  if (v === "warning") return "badge badge-warning";
  return "badge badge-info";
}

function statusBadgeClass(v: string) {
  if (v === "open") return "badge badge-warning";
  if (v === "following") return "badge badge-info";
  return "badge badge-success";
}

function alertIdText(a: AlertItem) {
  return String(a.displayId || a.id).replace(/^ALT-/i, "");
}

function singleNode(a: AlertItem) {
  const names = a.nodeNames.split(",").map((s) => s.trim()).filter(Boolean);
  return names.length === 1;
}

function pretty(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDatacenters, type Datacenter } from "@/api/datacenter";
import {
  assignNodeDatacenter,
  isolateNodes,
  listNodeEvents,
  listNodes,
  previewNodeQuotaImpact,
  recoverNodes,
  updateNodeLabels,
  updateNodeTaints,
  type ClusterNode,
  type NodeEvent,
  type NodeQuotaImpact,
  type NodeTaint,
} from "@/api/node";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeViewer } from "@/components/CodeEditor";
import { ListBody, ListLoading } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { Select } from "@/components/Select";
import { DcBadge, UsageCell } from "@/components/UsageCell";
import { formatTime } from "@/lib/format";
import { bytesToGi, milliToCores } from "@/lib/resources";
import { useWorkingCluster } from "@/lib/useWorkingCluster";
import { toast } from "@/lib/toast";
import { FieldError } from "@/components/Field";
import {
  firstZodMessage,
  focusField,
  invalidProps,
  K8S_LABEL_VALUE_MAX,
  K8S_QUALIFIED_NAME_MAX,
  zK8sLabelValue,
  zK8sQualifiedName,
  zK8sTaintEffect,
  zRequired,
  zTextOpt,
} from "@/lib/form";

type Tab = "nodes" | "records";
type EditorKind = "dc" | "labels" | "taints" | "isolate" | "recover";
type Editor = { kind: EditorKind; names: string[] } | null;
type LabelRow = { key: string; value: string };
type DetailTab = "overview" | "labels" | "taints" | "yaml";

export function NodePage() {
  const queryClient = useQueryClient();
  const { clusterId, clusters, current: workingCluster, loading: clustersLoading } = useWorkingCluster();
  const [tab, setTab] = useState<Tab>("nodes");
  const [keyword, setKeyword] = useState("");
  const [dc, setDc] = useState("all");
  const [status, setStatus] = useState("all");
  const [gpuType, setGpuType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor>(null);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [dcCode, setDcCode] = useState("");
  const [dcError, setDcError] = useState("");
  const [labelRows, setLabelRows] = useState<LabelRow[]>([]);
  const [labelAddKey, setLabelAddKey] = useState("");
  const [labelAddValue, setLabelAddValue] = useState("");
  const [labelErrors, setLabelErrors] = useState<Record<string, string>>({});
  const [taintRows, setTaintRows] = useState<NodeTaint[]>([]);
  const [taintAdd, setTaintAdd] = useState<NodeTaint>({ key: "", value: "", effect: "NoSchedule" });
  const [taintErrors, setTaintErrors] = useState<Record<string, string>>({});
  const [eventPage, setEventPage] = useState(1);
  const [eventQ, setEventQ] = useState("");
  const [eventAction, setEventAction] = useState("all");
  const [detail, setDetail] = useState<ClusterNode | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const dcQuery = useQuery({
    queryKey: ["datacenters", { pageNum: 1, pageSize: 100 }],
    queryFn: () => listDatacenters({ pageNum: 1, pageSize: 100 }),
  });
  const dcs: Datacenter[] = dcQuery.data?.list ?? [];

  const listQuery = useQuery({
    queryKey: ["nodes", { clusterId, keyword, dc, status, gpuType, page, pageSize }],
    queryFn: () =>
      listNodes({
        clusterId: clusterId!,
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        datacenter: dc,
        status,
        gpuType,
      }),
    enabled: Boolean(clusterId),
  });
  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const kpis = listQuery.data?.summary ?? { total: 0, ready: 0, notReady: 0, unschedulable: 0, unsetDc: 0 };
  const gpuTypes = listQuery.data?.gpuTypes ?? [];

  const eventsQuery = useQuery({
    queryKey: ["node-events", { clusterId }],
    queryFn: () => listNodeEvents({ clusterId: clusterId!, pageNum: 1, pageSize: 100 }),
    enabled: Boolean(clusterId),
  });
  const allEvents = eventsQuery.data?.list ?? [];
  const filteredEvents = allEvents.filter((ev) => {
    if (eventAction !== "all" && ev.action !== eventAction) {
      return false;
    }
    if (!eventQ.trim()) {
      return true;
    }
    const q = eventQ.trim().toLowerCase();
    return [ev.nodeName, ev.operator, ev.remark, actionLabel(ev.action)].some((v) => (v || "").toLowerCase().includes(q));
  });
  const eventPageSize = 10;
  const eventTotal = filteredEvents.length;
  const eventSlice = filteredEvents.slice((eventPage - 1) * eventPageSize, eventPage * eventPageSize);

  function invalidate() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nodes"] }),
      queryClient.invalidateQueries({ queryKey: ["node-events"] }),
      queryClient.invalidateQueries({ queryKey: ["clusters"] }),
    ]);
  }
  function showError(error: unknown) {
    toast.error(error instanceof ApiError ? error.message : "操作失败");
  }

  const lookup = (name: string) => rows.find((n) => n.name === name) || (detail?.name === name ? detail : undefined);
  const editorNodes = (editor?.names ?? []).map((name) => lookup(name)).filter((n): n is ClusterNode => Boolean(n));
  const labelsMerge = Boolean(editor && editor.kind === "labels" && editor.names.length > 1);
  const taintsMerge = Boolean(editor && editor.kind === "taints" && editor.names.length > 1);
  const enabledDcs = dcs;
  const isolateImpactQuery = useQuery({
    queryKey: ["node-quota-impact", clusterId, editor?.kind, editor?.names],
    queryFn: () => previewNodeQuotaImpact({ clusterId: clusterId!, names: editor!.names }),
    enabled: Boolean(clusterId && editor?.kind === "isolate" && editor.names.length),
  });

  const mutate = useMutation({
    mutationFn: async () => {
      if (!clusterId || !editor) return;
      const names = editor.names;
      if (editor.kind === "dc") return assignNodeDatacenter({ clusterId, names, code: dcCode });
      if (editor.kind === "labels") {
        const draft = collectLabels(labelRows);
        const payload = labelsMerge ? draft : replaceLabelsPayload(editorNodes[0]?.labels ?? {}, draft);
        return updateNodeLabels({ clusterId, names, labels: payload });
      }
      if (editor.kind === "taints") {
        if (taintsMerge) {
          await Promise.all(
            names.map((name) => {
              const node = lookup(name);
              return updateNodeTaints({ clusterId, names: [name], taints: mergeTaints(node?.taints ?? [], taintRows) });
            }),
          );
          return;
        }
        return updateNodeTaints({ clusterId, names, taints: taintRows });
      }
      if (editor.kind === "isolate") return isolateNodes({ clusterId, names, remark });
      return recoverNodes({ clusterId, names, remark });
    },
    onSuccess: async () => {
      const kind = editor?.kind;
      const names = editor?.names ?? [];
      const dcItem = enabledDcs.find((item) => item.code === dcCode);
      if (kind === "dc") {
        toast.success(`已为 ${names.length} 台节点设置数据中心：${dcItem?.name || dcCode}`);
      } else if (kind === "labels") {
        toast.success(labelsMerge ? `已为 ${names.length} 台节点合并写入标签` : `已更新节点标签：${names[0]}`);
      } else if (kind === "taints") {
        toast.success(taintsMerge ? `已为 ${names.length} 台节点合并写入污点` : `已更新节点污点：${names[0]}`);
      } else if (kind === "isolate") {
        toast.warning(names.length > 1 ? `已隔离 ${names.length} 台节点` : `已隔离节点 ${names[0]}`);
      } else if (kind === "recover") {
        toast.success(names.length > 1 ? `已入池 ${names.length} 台节点` : `已入池节点 ${names[0]}`);
      }
      const detailName = detail?.name;
      setEditor(null);
      setSelected((cur) => cur.filter((name) => !names.includes(name)));
      await invalidate();
      if (detailName && names.includes(detailName)) {
        const next = queryClient.getQueryData<typeof listQuery.data>(["nodes", { clusterId, keyword, dc, status, gpuType, page, pageSize }]);
        const refreshed = next?.list.find((n) => n.name === detailName);
        if (refreshed) setDetail(refreshed);
      }
    },
    onError: showError,
  });

  const dcMap = useMemo(() => Object.fromEntries(dcs.map((item) => [item.code, item])), [dcs]);
  const allChecked = rows.length > 0 && rows.every((n) => selected.includes(n.name));

  useEffect(() => {
    if (!detail) return;
    const next = rows.find((n) => n.name === detail.name);
    if (next) {
      setDetail(next);
    }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps -- 仅在列表刷新后同步当前详情

  if (clustersLoading) {
    return (
      <section className="page active" id="page-node-mgmt">
        <div className="page-header">
          <div>
            <h1>节点管理</h1>
            <p className="desc">K8s 节点运维</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body flush" id="node-mgmt-body">
            <ListLoading label="正在加载节点…" />
          </div>
        </div>
      </section>
    );
  }

  if (!clusters.length) {
    return (
      <section className="page active" id="page-node-mgmt">
        <div className="page-header">
          <div>
            <h1>节点管理</h1>
            <p className="desc">请先在「集群管理」接入 Kubernetes 集群</p>
          </div>
        </div>
        <div className="empty-state">暂无工作集群</div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-node-mgmt">
      <div className="page-header">
        <div>
          <h1>节点管理</h1>
          <p className="desc">K8s 节点运维：数据中心 / 标签 / 污点 · 故障隔离与入池 · 支持批量操作</p>
        </div>
      </div>
      <div className="stats-grid stats-grid-5 fault-kpi-row">
        <Stat label="已隔离" value={kpis.unschedulable} color="var(--warning)" valueClass="text-warning" />
        <Stat label="可调度" value={kpis.ready} color="var(--success)" valueClass="text-success" />
        <Stat label="未分配数据中心" value={kpis.unsetDc} color={kpis.unsetDc ? "var(--warning)" : "var(--primary)"} valueClass={kpis.unsetDc ? "text-warning" : undefined} />
        <Stat label="NotReady" value={kpis.notReady} color="var(--danger)" valueClass="text-danger" />
        <Stat label="维护记录" value={eventsQuery.data?.total ?? 0} color="var(--purple)" />
      </div>
      <div className="card">
        <div className="tabs" id="node-mgmt-tabs">
          <div className={tab === "nodes" ? "tab active" : "tab"} onClick={() => setTab("nodes")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            节点列表
          </div>
          <div className={tab === "records" ? "tab active" : "tab"} onClick={() => setTab("records")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            维护记录
          </div>
        </div>
        {tab === "nodes" ? (
          <>
            <div className="toolbar node-mgmt-toolbar">
              <div className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  value={keyword}
                  placeholder="搜索节点名称 / IP..."
                  onChange={(e) => {
                    setPage(1);
                    setKeyword(e.target.value);
                  }}
                />
              </div>
              <Select
                variant="filter"
                aria-label="按数据中心筛选"
                value={dc}
                options={[
                  { value: "all", label: "全部数据中心" },
                  { value: "unset", label: "未分配" },
                  ...dcs.map((item) => ({ value: item.code, label: item.name })),
                ]}
                onChange={setDc}
              />
              <Select
                variant="filter"
                aria-label="按状态筛选"
                value={status}
                options={[
                  { value: "all", label: "全部状态" },
                  { value: "Ready", label: "Ready" },
                  { value: "NotReady", label: "NotReady" },
                  { value: "SchedulingDisabled", label: "SchedulingDisabled" },
                ]}
                onChange={setStatus}
              />
              <Select
                variant="filter"
                aria-label="按卡型号筛选"
                value={gpuType}
                options={[{ value: "all", label: "全部卡型号" }, ...gpuTypes.map((t) => ({ value: t, label: t }))]}
                onChange={setGpuType}
              />
            </div>
            {selected.length ? (
              <div className="node-batch-bar">
                <span className="node-batch-count">已选 {selected.length} 台</span>
                <div className="node-batch-actions">
                  <Button size="sm" onClick={() => openEditor("dc", selected)}>
                    数据中心
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditor("labels", selected)}>
                    标签
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditor("taints", selected)}>
                    污点
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openEditor("isolate", selected)}>
                    隔离
                  </Button>
                  <Button size="sm" onClick={() => openEditor("recover", selected)}>
                    入池
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                    取消选择
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="card-body flush" id="node-mgmt-body">
              <ListBody
                loading={!clusterId || listQuery.isLoading}
                error={listQuery.isError}
                empty={rows.length === 0}
                loadingLabel="正在加载节点…"
                errorLabel="节点列表加载失败"
                emptyLabel="当前集群下没有匹配的节点"
              >
                <>
                  <div className="table-wrap node-mgmt-table-wrap">
                    <table className="table node-mgmt-table">
                      <thead>
                        <tr>
                          <th className="th-check">
                            <input type="checkbox" title="全选当前页" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? rows.map((n) => n.name) : [])} />
                          </th>
                          <th>节点</th>
                          <th>数据中心</th>
                          <th>IP</th>
                          <th>CPU</th>
                          <th>内存</th>
                          <th>GPU 用量</th>
                          <th>GPU 型号</th>
                          <th>状态</th>
                          <th>Pods</th>
                          <th>隔离信息</th>
                          <th className="th-actions th-actions-sticky">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((n) => (
                          <tr key={n.name} className={selected.includes(n.name) ? "is-row-selected" : n.isolated ? "is-disabled-row" : undefined}>
                            <td className="td-check">
                              <input type="checkbox" checked={selected.includes(n.name)} onChange={() => toggle(n.name)} aria-label={`选择 ${n.name}`} />
                            </td>
                            <td className="td-node-name">
                              <button type="button" className="node-name-link" title="查看节点详情" onClick={() => openDetail(n)}>
                                <span className="node-name-text">{n.name}</span>
                              </button>
                              <div className="node-name-meta">{n.roles[0] || "worker"}</div>
                            </td>
                            <td>
                              <DcBadge code={n.datacenter} name={n.datacenterName || dcMap[n.datacenter]?.name} shortName={n.datacenterShortName || dcMap[n.datacenter]?.shortName} color={n.datacenterColor || dcMap[n.datacenter]?.color} />
                            </td>
                            <td className="mono text-muted">{n.ip || "—"}</td>
                            <td className="td-node-usage">
                              <UsageCell used={n.cpuTotalMilli ? milliToCores(n.cpuUsedMilli) : null} total={milliToCores(n.cpuTotalMilli)} unit="核" label="CPU" unknown={n.status === "NotReady"} />
                            </td>
                            <td className="td-node-usage">
                              <UsageCell
                                used={n.memTotalBytes ? Math.round(bytesToGi(n.memUsedBytes) * 10) / 10 : null}
                                total={Math.round(bytesToGi(n.memTotalBytes) * 10) / 10}
                                unit="Gi"
                                label="内存"
                                unknown={n.status === "NotReady"}
                              />
                            </td>
                            <td className="td-node-usage">
                              <UsageCell used={n.gpuTotal ? n.gpuUsed : null} total={n.gpuTotal} label="GPU" unknown={n.status === "NotReady"} />
                            </td>
                            <td className="td-node-gpu-type">
                              <span className="node-gpu-type-text" title={n.gpuType || "—"}>
                                {n.gpuType || "—"}
                              </span>
                              {n.hasIB ? (
                                <span className="tag" style={{ background: "var(--info-soft)", color: "var(--info)", marginLeft: 4 }}>
                                  IB
                                </span>
                              ) : null}
                            </td>
                            <td className="td-node-status">
                              <NodeStatusBadge node={n} />
                            </td>
                            <td className="td-node-pods">
                              <span className={`node-pods-cell${n.status === "NotReady" ? " is-unknown" : ""}`}>
                                <span className="node-pods-used">{n.podCount}</span>
                                <span className="node-pods-sep">/</span>
                                <span className="node-pods-cap">{n.podCapacity}</span>
                              </span>
                            </td>
                            <td className="td-node-iso">
                              {n.isolated ? (
                                <div className="node-iso-cell">
                                  <div>已隔离</div>
                                  {n.isolateRemark ? (
                                    <div className="node-iso-remark" title={n.isolateRemark}>
                                      {n.isolateRemark}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="td-actions td-actions-sticky">
                              <div className="job-actions job-actions-stack">
                                <div className="job-actions-row">
                                  <Button size="sm" variant="secondary" onClick={() => openEditor("dc", [n.name], n)}>
                                    数据中心
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => openEditor("labels", [n.name], n)}>
                                    标签
                                  </Button>
                                </div>
                                <div className="job-actions-row">
                                  <Button size="sm" variant="secondary" onClick={() => openEditor("taints", [n.name], n)}>
                                    污点
                                  </Button>
                                  <Button size="sm" variant={n.isolated ? "primary" : "danger"} onClick={() => openEditor(n.isolated ? "recover" : "isolate", [n.name], n)}>
                                    {n.isolated ? "入池" : "隔离"}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
                </>
              </ListBody>
            </div>
          </>
        ) : (
          <>
            <div className="toolbar node-mgmt-toolbar">
              <div className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  placeholder="搜索节点 / 操作人 / 备注..."
                  value={eventQ}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventQ(e.target.value);
                  }}
                />
              </div>
              <div className="alert-filter-group">
                <span className="alert-filter-label">操作类型</span>
                <div className="alert-chip-group">
                  {[
                    ["all", "全部"],
                    ["isolate", "隔离"],
                    ["recover", "入池"],
                    ["set-dc", "数据中心"],
                    ["labels", "标签"],
                    ["taints", "污点"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={eventAction === key ? "alert-chip active" : "alert-chip"}
                      onClick={() => {
                        setEventAction(key);
                        setEventPage(1);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-body flush" id="node-mgmt-records-list">
              <ListBody
                loading={eventsQuery.isLoading}
                error={eventsQuery.isError}
                empty={eventSlice.length === 0}
                loadingLabel="正在加载维护记录…"
                errorLabel="维护记录加载失败"
                emptyLabel="暂无维护记录"
              >
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>操作</th>
                        <th>节点</th>
                        <th>操作人</th>
                        <th>备注</th>
                        <th>结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventSlice.map((ev: NodeEvent) => (
                        <tr key={ev.id}>
                          <td className="mono text-muted">{formatTime(ev.createdAt)}</td>
                          <td>
                            <span className={`badge ${actionBadgeClass(ev.action)}`}>{actionLabel(ev.action)}</span>
                          </td>
                          <td className="mono" style={{ color: "var(--text-0)", fontWeight: 500 }}>{ev.nodeName}</td>
                          <td>{ev.operator || "—"}</td>
                          <td style={{ maxWidth: 360 }}>{ev.remark || "—"}</td>
                          <td>
                            <span className={`badge ${ev.result === "success" ? "badge-success" : "badge-failed"}`}>
                              {ev.result === "success" ? "成功" : "失败"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={eventPage} pageSize={eventPageSize} total={eventTotal} onPageChange={setEventPage} />
              </ListBody>
            </div>
          </>
        )}
      </div>

      <Modal
        open={editor?.kind === "dc"}
        title={editor && editor.names.length > 1 ? "批量设置数据中心" : "设置数据中心"}
        confirmText="确认设置"
        maxWidth={480}
        onClose={() => setEditor(null)}
        onConfirm={submitDc}
        confirmDisabled={mutate.isPending}
      >
        <p className="modal-lead">
          新接入节点通常尚未标记数据中心。设置后将写入节点 label <span className="mono">maip.io/datacenter</span>，供队列调度与资源归属使用。
        </p>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>
            目标节点 <span className="text-muted" style={{ fontWeight: 400 }}>（{editor?.names.length ?? 0} 台）</span>
          </label>
          <TargetChips names={editor?.names ?? []} lookup={lookup} />
        </div>
        <div className={dcError ? "form-group is-invalid" : "form-group"}>
          <label htmlFor="node-dc-form-select">
            数据中心 <span className="req">*</span>
          </label>
          <Select
            id="node-dc-form-select"
            value={dcCode}
            aria-invalid={dcError ? true : undefined}
            aria-describedby={dcError ? "node-dc-form-select-error" : undefined}
            options={[
              { value: "", label: "请选择数据中心" },
              ...enabledDcs.map((item) => ({ value: item.code, label: `${item.name} · ${item.code}` })),
            ]}
            onChange={(next) => {
              setDcCode(next);
              setDcError("");
            }}
          />
          <FieldError id="node-dc-form-select-error">{dcError}</FieldError>
        </div>
      </Modal>

      <Modal
        open={editor?.kind === "labels"}
        title={labelsMerge ? `批量设置标签 · ${editor?.names.length} 台` : `标签管理 · ${editor?.names[0] || ""}`}
        confirmText={labelsMerge ? "批量写入标签" : "保存标签"}
        modalClassName="modal-node-editor"
        onClose={() => setEditor(null)}
        onConfirm={submitLabels}
        confirmDisabled={mutate.isPending}
      >
        {labelsMerge ? (
          <p className="text-muted node-batch-modal-hint">批量模式：以下标签将合并写入所选节点（同名 key 覆盖原值，其它已有标签保留）。请添加需要设置的标签。</p>
        ) : null}
        {labelsMerge ? <TargetChips names={editor?.names ?? []} lookup={lookup} /> : null}
        <div className="node-labels-editor">
          {labelRows.length ? (
            labelRows.map((row, idx) => {
              const keyId = labelRowKeyId(idx);
              const valueId = labelRowValueId(idx);
              const keyErr = labelErrors[keyId];
              const valueErr = labelErrors[valueId];
              return (
                <div key={`${row.key}-${idx}`} className="node-label-row-block">
                  <div className="node-label-row">
                    <input
                      id={keyId}
                      className="node-label-k"
                      aria-label="标签 key"
                      maxLength={K8S_QUALIFIED_NAME_MAX}
                      value={row.key}
                      spellCheck={false}
                      {...invalidProps(keyId, keyErr)}
                      onChange={(e) => {
                        updateLabelRow(idx, { ...row, key: e.target.value });
                        clearFieldError(setLabelErrors, keyId);
                      }}
                    />
                    <input
                      id={valueId}
                      className="node-label-v"
                      aria-label="标签 value"
                      maxLength={K8S_LABEL_VALUE_MAX}
                      value={row.value}
                      placeholder="(empty)"
                      spellCheck={false}
                      {...invalidProps(valueId, valueErr)}
                      onChange={(e) => {
                        updateLabelRow(idx, { ...row, value: e.target.value });
                        clearFieldError(setLabelErrors, valueId);
                      }}
                    />
                    <Button size="sm" variant="danger" onClick={() => setLabelRows((cur) => cur.filter((_, i) => i !== idx))}>
                      删除
                    </Button>
                  </div>
                  <FieldError id={`${keyId}-error`}>{keyErr}</FieldError>
                  <FieldError id={`${valueId}-error`}>{valueErr}</FieldError>
                </div>
              );
            })
          ) : (
            <div className="node-editor-empty">{labelsMerge ? "批量写入列表为空，请在下方添加要合并的标签" : "暂无标签，请在下方添加"}</div>
          )}
        </div>
        <div className="node-label-add-row">
          <input
            id="node-label-add-key"
            value={labelAddKey}
            placeholder="key，如 maip.io/pool"
            autoComplete="off"
            spellCheck={false}
            maxLength={K8S_QUALIFIED_NAME_MAX}
            {...invalidProps("node-label-add-key", labelErrors["node-label-add-key"])}
            onChange={(e) => {
              setLabelAddKey(e.target.value);
              clearFieldError(setLabelErrors, "node-label-add-key");
            }}
          />
          <input
            id="node-label-add-value"
            value={labelAddValue}
            placeholder="value"
            autoComplete="off"
            spellCheck={false}
            maxLength={K8S_LABEL_VALUE_MAX}
            {...invalidProps("node-label-add-value", labelErrors["node-label-add-value"])}
            onChange={(e) => {
              setLabelAddValue(e.target.value);
              clearFieldError(setLabelErrors, "node-label-add-value");
            }}
          />
          <Button size="sm" variant="secondary" onClick={addLabelRow}>
            添加
          </Button>
        </div>
        <FieldError id="node-label-add-key-error">{labelErrors["node-label-add-key"]}</FieldError>
        <FieldError id="node-label-add-value-error">{labelErrors["node-label-add-value"]}</FieldError>
      </Modal>

      <Modal
        open={editor?.kind === "taints"}
        title={taintsMerge ? `批量添加污点 · ${editor?.names.length} 台` : `污点管理 · ${editor?.names[0] || ""}`}
        confirmText={taintsMerge ? "批量写入污点" : "保存污点"}
        modalClassName="modal-node-editor"
        onClose={() => setEditor(null)}
        onConfirm={submitTaints}
        confirmDisabled={mutate.isPending}
      >
        {taintsMerge ? (
          <p className="text-muted node-batch-modal-hint">批量模式：以下污点将合并添加到所选节点（相同 key + effect 覆盖，其它污点保留）。请添加需要写入的污点。</p>
        ) : null}
        {taintsMerge ? <TargetChips names={editor?.names ?? []} lookup={lookup} /> : null}
        <div className="node-taints-editor">
          {taintRows.length ? (
            taintRows.map((t, idx) => {
              const text = `${t.key}${t.value ? `=${t.value}` : ""}:${t.effect}`;
              const rowErr = taintErrors[taintRowId(idx)];
              return (
                <div key={`${t.key}-${t.effect}-${idx}`} className="node-taint-row-block">
                  <div className="node-taint-row">
                    <span className="k8s-taint-tag mono" title={text}>
                      {text}
                    </span>
                    <Button size="sm" variant="danger" onClick={() => setTaintRows((cur) => cur.filter((_, i) => i !== idx))}>
                      删除
                    </Button>
                  </div>
                  <FieldError id={`${taintRowId(idx)}-error`}>{rowErr}</FieldError>
                </div>
              );
            })
          ) : (
            <div className="node-editor-empty">{taintsMerge ? "批量写入列表为空，请在下方添加要合并的污点" : "当前节点无污点"}</div>
          )}
        </div>
        <div className="node-taint-add-row">
          <input
            id="node-taint-add-key"
            value={taintAdd.key}
            placeholder="key，如 dedicated"
            autoComplete="off"
            spellCheck={false}
            maxLength={K8S_QUALIFIED_NAME_MAX}
            {...invalidProps("node-taint-add-key", taintErrors["node-taint-add-key"])}
            onChange={(e) => {
              setTaintAdd({ ...taintAdd, key: e.target.value });
              clearFieldError(setTaintErrors, "node-taint-add-key");
            }}
          />
          <input
            id="node-taint-add-value"
            value={taintAdd.value}
            placeholder="value（可空）"
            autoComplete="off"
            spellCheck={false}
            maxLength={K8S_LABEL_VALUE_MAX}
            {...invalidProps("node-taint-add-value", taintErrors["node-taint-add-value"])}
            onChange={(e) => {
              setTaintAdd({ ...taintAdd, value: e.target.value });
              clearFieldError(setTaintErrors, "node-taint-add-value");
            }}
          />
          <Select
            id="node-taint-add-effect"
            variant="filter"
            aria-label="污点 effect"
            value={taintAdd.effect}
            {...invalidProps("node-taint-add-effect", taintErrors["node-taint-add-effect"])}
            options={[
              { value: "NoSchedule", label: "NoSchedule" },
              { value: "PreferNoSchedule", label: "PreferNoSchedule" },
              { value: "NoExecute", label: "NoExecute" },
            ]}
            onChange={(next) => {
              setTaintAdd({ ...taintAdd, effect: next });
              clearFieldError(setTaintErrors, "node-taint-add-effect");
            }}
          />
          <Button size="sm" variant="secondary" onClick={addTaintRow}>
            添加
          </Button>
        </div>
        <FieldError id="node-taint-add-key-error">{taintErrors["node-taint-add-key"]}</FieldError>
        <FieldError id="node-taint-add-value-error">{taintErrors["node-taint-add-value"]}</FieldError>
        <FieldError id="node-taint-add-effect-error">{taintErrors["node-taint-add-effect"]}</FieldError>
      </Modal>

      <Modal
        open={editor?.kind === "isolate" || editor?.kind === "recover"}
        title={maintTitle(editor)}
        confirmText={maintConfirmText(editor)}
        confirmVariant={editor?.kind === "isolate" ? "danger" : "primary"}
        modalClassName="modal-maint"
        onClose={() => setEditor(null)}
        onConfirm={() => {
          const parsed = zTextOpt().safeParse(remark);
          if (!parsed.success) {
            setRemarkError(firstZodMessage(parsed.error));
            focusField("modal-maint-remark");
            return;
          }
          setRemarkError("");
          mutate.mutate();
        }}
        confirmDisabled={mutate.isPending || (editor?.kind === "isolate" && isolateImpactQuery.isFetching)}
      >
        <p className="modal-maint-msg">
          <MaintMsg editor={editor} />
        </p>
        <p className="modal-maint-node mono">{maintNodeLine(editor, lookup)}</p>
        <p className={`modal-maint-hint ${editor?.kind === "recover" ? "is-success" : "is-danger"}`}>{maintHint(editor?.kind)}</p>
        {editor?.kind === "isolate" ? (
          <QuotaImpactHint
            loading={isolateImpactQuery.isFetching}
            failed={isolateImpactQuery.isError}
            impact={isolateImpactQuery.data}
            dcName={(code) => dcs.find((item) => item.code === code)?.name || code}
          />
        ) : null}
        <div className={remarkError ? "form-group is-invalid" : "form-group"}>
          <label htmlFor="modal-maint-remark">
            备注 <span className="text-muted" style={{ fontWeight: 400 }}>
              （可选）
            </span>
          </label>
          <textarea
            id="modal-maint-remark"
            rows={3}
            placeholder="填写维护说明，将记入维护记录…"
            value={remark}
            aria-invalid={remarkError ? true : undefined}
            onChange={(e) => {
              setRemark(e.target.value);
              setRemarkError("");
            }}
          />
          <FieldError id="modal-maint-remark-error">{remarkError}</FieldError>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail) && !editor}
        title={detail?.name || "节点详情"}
        modalClassName="modal-node-detail"
        cancelText="关闭"
        confirmText="管理标签"
        onClose={() => setDetail(null)}
        onConfirm={() => {
          if (detail) openEditor("labels", [detail.name], detail);
        }}
        footerLeft={
          detail ? (
            <>
              {!detail.isolated ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => openEditor("isolate", [detail.name], detail)}
                >
                  隔离
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openEditor("recover", [detail.name], detail)}
                >
                  入池
                </Button>
              )}
            </>
          ) : null
        }
      >
        {detail ? (
          <>
            <div className="tabs node-detail-tabs" role="tablist">
              {(
                [
                  ["overview", "概览"],
                  ["labels", `标签`],
                  ["taints", `污点`],
                  ["yaml", "YAML"],
                ] as [DetailTab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={detailTab === id ? "tab active" : "tab"}
                  role="tab"
                  aria-selected={detailTab === id}
                  onClick={() => setDetailTab(id)}
                >
                  {label}
                  {id === "labels" ? <span className={`tab-count ${Object.keys(detail.labels).length ? "" : "is-zero"}`}>{Object.keys(detail.labels).length}</span> : null}
                  {id === "taints" ? <span className={`tab-count ${detail.taints.length ? "" : "is-zero"}`}>{detail.taints.length}</span> : null}
                </button>
              ))}
            </div>
            <div className="node-detail-panels">
              {detailTab === "overview" ? (
                <div className="tab-panel active" role="tabpanel">
                  <div className="kv-grid">
                    <div className="kv-item">
                      <span className="k">节点</span>
                      <span className="v mono">{detail.name}</span>
                    </div>
                    <div className="kv-item">
                      <span className="k">状态</span>
                      <span className="v">
                        <NodeStatusBadge node={detail} />
                      </span>
                    </div>
                    <div className="kv-item">
                      <span className="k">集群</span>
                      <span className="v">{workingCluster?.displayName || "—"}</span>
                    </div>
                    <div className="kv-item">
                      <span className="k">数据中心</span>
                      <span className="v" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <DcBadge code={detail.datacenter} name={detail.datacenterName || dcMap[detail.datacenter]?.name} shortName={detail.datacenterShortName || dcMap[detail.datacenter]?.shortName} color={detail.datacenterColor || dcMap[detail.datacenter]?.color} />
                        <Button size="sm" variant={detail.datacenter ? "ghost" : "secondary"} onClick={() => openEditor("dc", [detail.name], detail)}>
                          {detail.datacenter ? "修改" : "设置"}
                        </Button>
                      </span>
                    </div>
                    <div className="kv-item">
                      <span className="k">IP</span>
                      <span className="v mono">{detail.ip || "—"}</span>
                    </div>
                    <div className="kv-item">
                      <span className="k">角色</span>
                      <span className="v">{detail.roles.join(", ") || "worker"}</span>
                    </div>
                    <div className="kv-item">
                      <span className="k">GPU 型号</span>
                      <span className="v">{detail.gpuType || "—"}</span>
                    </div>
                    <div className="kv-item">
                      <span className="k">支持 IB</span>
                      <span className="v">
                        {detail.hasIB ? (
                          <span className="tag" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                            是
                          </span>
                        ) : (
                          <span className="text-muted">否</span>
                        )}
                      </span>
                    </div>
                    <div className="kv-item full">
                      <span className="k">资源用量</span>
                      <span className="v">
                        <div className="node-usage-detail">
                          <div className="node-usage-detail-row">
                            <span className="node-usage-detail-label">CPU</span>
                            <UsageCell used={detail.cpuTotalMilli ? milliToCores(detail.cpuUsedMilli) : null} total={milliToCores(detail.cpuTotalMilli)} unit="核" label="CPU" unknown={detail.status === "NotReady"} />
                          </div>
                          <div className="node-usage-detail-row">
                            <span className="node-usage-detail-label">内存</span>
                            <UsageCell
                              used={detail.memTotalBytes ? Math.round(bytesToGi(detail.memUsedBytes) * 10) / 10 : null}
                              total={Math.round(bytesToGi(detail.memTotalBytes) * 10) / 10}
                              unit="Gi"
                              label="内存"
                              unknown={detail.status === "NotReady"}
                            />
                          </div>
                          <div className="node-usage-detail-row">
                            <span className="node-usage-detail-label">GPU</span>
                            <UsageCell used={detail.gpuTotal ? detail.gpuUsed : null} total={detail.gpuTotal} label="GPU" unknown={detail.status === "NotReady"} />
                          </div>
                        </div>
                      </span>
                    </div>
                    <div className="kv-item">
                      <span className="k">Pods</span>
                      <span className="v mono">
                        {detail.podCount}/{detail.podCapacity}
                      </span>
                    </div>
                    <div className="kv-item">
                      <span className="k">调度状态</span>
                      <span className="v">
                        <span className={detail.isolated ? "badge badge-warning" : "badge badge-healthy"}>{detail.isolated ? "已隔离" : "可调度"}</span>
                      </span>
                    </div>
                    {detail.isolated ? (
                      <div className="kv-item full">
                        <span className="k">隔离信息</span>
                        <span className="v">{detail.isolateRemark || "已隔离"}</span>
                      </div>
                    ) : null}
                    <div className="kv-item full">
                      <span className="k">Conditions</span>
                      <span className="v node-condition-tags">
                        <NodeConditionTags node={detail} />
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              {detailTab === "labels" ? (
                <div className="tab-panel active" role="tabpanel">
                  <div className="node-detail-section">
                    <div className="node-detail-section-title">Labels（{Object.keys(detail.labels).length}）</div>
                    <K8sLabels labels={detail.labels} />
                  </div>
                </div>
              ) : null}
              {detailTab === "taints" ? (
                <div className="tab-panel active" role="tabpanel">
                  <div className="node-detail-section">
                    <div className="node-detail-section-title">Taints（{detail.taints.length}）</div>
                    <K8sTaints taints={detail.taints} />
                  </div>
                </div>
              ) : null}
              {detailTab === "yaml" ? (
                <div className="tab-panel active" role="tabpanel">
                  <div className="node-kubectl-get">
                    <div className="node-yaml-hint mono">kubectl get node {detail.name}</div>
                    <div className="table-wrap">
                      <table className="table node-kubectl-table">
                        <thead>
                          <tr>
                            <th>NAME</th>
                            <th>STATUS</th>
                            <th>ROLES</th>
                            <th>AGE</th>
                            <th>VERSION</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="mono">{detail.name}</td>
                            <td className="mono">{kubectlStatus(detail)}</td>
                            <td>{detail.roles.join(",") || "worker"}</td>
                            <td>—</td>
                            <td className="mono">{workingCluster?.version || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="node-yaml-toolbar">
                    <span className="node-yaml-hint mono">kubectl get node {detail.name} -o yaml</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(buildNodeYaml(detail, workingCluster?.displayName));
                          toast.success("YAML 已复制到剪贴板");
                        } catch {
                          toast.warning("复制失败，请手动选择复制");
                        }
                      }}
                    >
                      复制
                    </Button>
                  </div>
                  <CodeViewer
                    className="node-yaml-block"
                    language="yaml"
                    value={buildNodeYaml(detail, workingCluster?.displayName)}
                    lineNumbers
                    wrap={false}
                    aria-label="节点 YAML"
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </section>
  );

  function toggle(name: string) {
    setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }

  function openDetail(n: ClusterNode) {
    setDetail(n);
    setDetailTab("overview");
  }

  function openEditor(kind: EditorKind, names: string[], node?: ClusterNode) {
    const unique = [...new Set(names.filter(Boolean))];
    if (!unique.length) {
      toast.warning("请先选择节点");
      return;
    }
    if (kind === "isolate" || kind === "recover") {
      const applicable = unique.filter((name) => {
        const n = lookup(name) || (node?.name === name ? node : undefined);
        if (!n) return kind === "isolate";
        return kind === "isolate" ? !n.isolated : n.isolated;
      });
      if (!applicable.length) {
        toast.warning(kind === "isolate" ? "所选节点均已处于隔离状态，无需再次隔离" : "所选节点均已可调度，无需入池");
        return;
      }
      setEditor({ kind, names: applicable });
      setRemark("");
      return;
    }
    setEditor({ kind, names: unique });
    setDcError("");
    setLabelErrors({});
    setTaintErrors({});
    if (kind === "dc") {
      setDcCode(unique.length === 1 ? node?.datacenter || lookup(unique[0])?.datacenter || "" : "");
    }
    if (kind === "labels") {
      const source = unique.length === 1 ? node?.labels || lookup(unique[0])?.labels || {} : {};
      setLabelRows(Object.entries(source).map(([key, value]) => ({ key, value })));
      setLabelAddKey("");
      setLabelAddValue("");
    }
    if (kind === "taints") {
      const source = unique.length === 1 ? node?.taints || lookup(unique[0])?.taints || [] : [];
      setTaintRows(source.map((t) => ({ ...t })));
      setTaintAdd({ key: "", value: "", effect: "NoSchedule" });
    }
  }

  function submitDc() {
    const parsed = zRequired("请选择数据中心").safeParse(dcCode);
    if (!parsed.success) {
      setDcError(firstZodMessage(parsed.error));
      focusField("node-dc-form-select");
      return;
    }
    setDcError("");
    mutate.mutate();
  }

  function addLabelRow() {
    const errors: Record<string, string> = {};
    const keyParsed = zK8sQualifiedName("请输入标签 key", "标签 key").safeParse(labelAddKey);
    if (!keyParsed.success) {
      errors["node-label-add-key"] = firstZodMessage(keyParsed.error);
    }
    const valueParsed = zK8sLabelValue("标签 value").safeParse(labelAddValue);
    if (!valueParsed.success) {
      errors["node-label-add-value"] = firstZodMessage(valueParsed.error);
    }
    if (keyParsed.success && labelRows.some((row) => row.key.trim() === keyParsed.data)) {
      errors["node-label-add-key"] = errors["node-label-add-key"] || "该 key 已存在";
    }
    if (showFieldErrors(setLabelErrors, errors) || !keyParsed.success || !valueParsed.success) {
      return;
    }
    setLabelRows((cur) => [...cur, { key: keyParsed.data, value: valueParsed.data }]);
    setLabelAddKey("");
    setLabelAddValue("");
    setLabelErrors({});
  }

  function updateLabelRow(idx: number, next: LabelRow) {
    setLabelRows((cur) => cur.map((row, i) => (i === idx ? next : row)));
  }

  function submitLabels() {
    const errors = collectLabelRowErrors(labelRows);
    if (labelsMerge && !labelRows.length) {
      errors["node-label-add-key"] = "请至少添加一个要批量写入的标签";
    }
    if (showFieldErrors(setLabelErrors, errors)) {
      return;
    }
    setLabelErrors({});
    mutate.mutate();
  }

  function addTaintRow() {
    const errors: Record<string, string> = {};
    const keyParsed = zK8sQualifiedName("请输入污点 key", "污点 key").safeParse(taintAdd.key);
    if (!keyParsed.success) {
      errors["node-taint-add-key"] = firstZodMessage(keyParsed.error);
    }
    const valueParsed = zK8sLabelValue("污点 value").safeParse(taintAdd.value);
    if (!valueParsed.success) {
      errors["node-taint-add-value"] = firstZodMessage(valueParsed.error);
    }
    const effectParsed = zK8sTaintEffect().safeParse(taintAdd.effect);
    if (!effectParsed.success) {
      errors["node-taint-add-effect"] = firstZodMessage(effectParsed.error);
    }
    if (keyParsed.success && effectParsed.success && taintRows.some((t) => t.key.trim() === keyParsed.data && t.effect === effectParsed.data)) {
      errors["node-taint-add-key"] = errors["node-taint-add-key"] || "相同 key + effect 的污点已存在";
    }
    if (showFieldErrors(setTaintErrors, errors) || !keyParsed.success || !valueParsed.success || !effectParsed.success) {
      return;
    }
    setTaintRows((cur) => [...cur, { key: keyParsed.data, value: valueParsed.data, effect: effectParsed.data }]);
    setTaintAdd({ key: "", value: "", effect: "NoSchedule" });
    setTaintErrors({});
  }

  function submitTaints() {
    const errors = collectTaintRowErrors(taintRows);
    if (taintsMerge && !taintRows.length) {
      errors["node-taint-add-key"] = "请至少添加一个要批量写入的污点";
    }
    if (showFieldErrors(setTaintErrors, errors)) {
      return;
    }
    setTaintErrors({});
    mutate.mutate();
  }
}

function Stat({ label, value, color, valueClass }: { label: string; value: number; color?: string; valueClass?: string }) {
  return (
    <div className="stat-card" style={{ ["--stat-color" as string]: color || "var(--primary)" }}>
      <div className="stat-label">{label}</div>
      <div className={valueClass ? `stat-value ${valueClass}` : "stat-value"}>{value}</div>
    </div>
  );
}

function TargetChips({ names, lookup }: { names: string[]; lookup: (name: string) => ClusterNode | undefined }) {
  const show = names.slice(0, 12);
  const more = names.length - show.length;
  return (
    <div className="node-dc-target-list">
      {show.map((name) => {
        const n = lookup(name);
        const unset = n ? !n.datacenter : false;
        return (
          <span key={name} className="node-dc-chip mono" title={n?.datacenter ? `当前：${n.datacenter}` : "当前：未分配"}>
            {name}
            {unset ? <i className="node-dc-chip-dot" title="未分配" /> : null}
          </span>
        );
      })}
      {more > 0 ? (
        <span className="text-muted" style={{ fontSize: 12 }}>
          +{more} 台
        </span>
      ) : null}
    </div>
  );
}

function K8sLabels({ labels }: { labels: Record<string, string> }) {
  const entries = Object.entries(labels || {});
  if (!entries.length) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div className="k8s-label-list">
      {entries.map(([k, v]) => (
        <span key={k} className="k8s-label-tag" title={`${k}=${v ?? ""}`}>
          <span className="k8s-label-key">{k}</span>
          {v ? (
            <>
              <span className="k8s-label-eq">=</span>
              <span className="k8s-label-val">{v}</span>
            </>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function K8sTaints({ taints }: { taints: NodeTaint[] }) {
  if (!taints.length) {
    return <span className="text-muted">无污点</span>;
  }
  return (
    <div className="k8s-taint-list">
      {taints.map((t) => {
        const text = t.value ? `${t.key}=${t.value}:${t.effect}` : `${t.key}:${t.effect}`;
        return (
          <span key={text} className="k8s-taint-tag mono" title={text}>
            {text}
          </span>
        );
      })}
    </div>
  );
}

function collectLabels(rows: LabelRow[]) {
  const out: Record<string, string> = {};
  rows.forEach((row) => {
    const key = row.key.trim();
    if (key) out[key] = row.value.trim();
  });
  return out;
}

function labelRowKeyId(idx: number) {
  return `node-label-row-${idx}-key`;
}

function labelRowValueId(idx: number) {
  return `node-label-row-${idx}-value`;
}

function taintRowId(idx: number) {
  return `node-taint-row-${idx}`;
}

function collectLabelRowErrors(rows: LabelRow[]) {
  const errors: Record<string, string> = {};
  const seen = new Map<string, number>();
  rows.forEach((row, idx) => {
    const keyId = labelRowKeyId(idx);
    const valueId = labelRowValueId(idx);
    const keyParsed = zK8sQualifiedName("请输入标签 key", "标签 key").safeParse(row.key);
    if (!keyParsed.success) {
      errors[keyId] = firstZodMessage(keyParsed.error);
    } else {
      const prev = seen.get(keyParsed.data);
      if (prev !== undefined) {
        errors[keyId] = "该 key 已存在";
      } else {
        seen.set(keyParsed.data, idx);
      }
    }
    const valueParsed = zK8sLabelValue("标签 value").safeParse(row.value);
    if (!valueParsed.success) {
      errors[valueId] = firstZodMessage(valueParsed.error);
    }
  });
  return errors;
}

function collectTaintRowErrors(rows: NodeTaint[]) {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  rows.forEach((t, idx) => {
    const rowId = taintRowId(idx);
    const keyParsed = zK8sQualifiedName("请输入污点 key", "污点 key").safeParse(t.key);
    const valueParsed = zK8sLabelValue("污点 value").safeParse(t.value);
    const effectParsed = zK8sTaintEffect().safeParse(t.effect);
    const messages = [
      keyParsed.success ? "" : firstZodMessage(keyParsed.error),
      valueParsed.success ? "" : firstZodMessage(valueParsed.error),
      effectParsed.success ? "" : firstZodMessage(effectParsed.error),
    ].filter(Boolean);
    if (keyParsed.success && effectParsed.success) {
      const fingerprint = `${keyParsed.data}\0${effectParsed.data}`;
      if (seen.has(fingerprint)) {
        messages.push("相同 key + effect 的污点已存在");
      } else {
        seen.add(fingerprint);
      }
    }
    if (messages.length) {
      errors[rowId] = messages[0];
    }
  });
  return errors;
}

function showFieldErrors(setErrors: (errors: Record<string, string>) => void, errors: Record<string, string>) {
  if (!Object.keys(errors).length) {
    return false;
  }
  setErrors(errors);
  focusField(Object.keys(errors)[0]);
  return true;
}

function clearFieldError(setErrors: (updater: (cur: Record<string, string>) => Record<string, string>) => void, id: string) {
  setErrors((cur) => {
    if (!(id in cur)) {
      return cur;
    }
    const next = { ...cur };
    delete next[id];
    return next;
  });
}

function replaceLabelsPayload(original: Record<string, string>, next: Record<string, string>) {
  const payload = { ...next };
  Object.keys(original).forEach((key) => {
    if (!(key in next)) {
      payload[key] = "";
    }
  });
  return payload;
}

function mergeTaints(current: NodeTaint[], added: NodeTaint[]) {
  const out = current.map((t) => ({ ...t }));
  added.forEach((t) => {
    const idx = out.findIndex((x) => x.key === t.key && x.effect === t.effect);
    if (idx >= 0) out[idx] = { ...t };
    else out.push({ ...t });
  });
  return out;
}

function maintTitle(editor: Editor) {
  if (!editor) return "确认维护";
  const multi = editor.names.length > 1;
  if (editor.kind === "isolate") return multi ? "确认批量隔离" : "确认节点隔离";
  if (editor.kind === "recover") return multi ? "确认批量入池" : "确认节点入池";
  return "确认维护";
}

function maintConfirmText(editor: Editor) {
  if (!editor) return "确认";
  const label = editor.kind === "recover" ? "入池" : "隔离";
  return editor.names.length > 1 ? `确认${label} ${editor.names.length} 台` : `确认${label}`;
}

function MaintMsg({ editor }: { editor: Editor }) {
  if (!editor) return null;
  const multi = editor.names.length > 1;
  if (editor.kind === "isolate") {
    return multi ? (
      <>
        确定将选中的 <strong>{editor.names.length}</strong> 台节点从调度池隔离吗？
      </>
    ) : (
      <>
        确定将节点 <strong>{editor.names[0]}</strong> 从调度池隔离吗？
      </>
    );
  }
  return multi ? (
    <>
      确定将选中的 <strong>{editor.names.length}</strong> 台节点重新加入调度吗？
    </>
  ) : (
    <>
      确定将节点 <strong>{editor.names[0]}</strong> 重新加入调度吗？
    </>
  );
}

function maintHint(kind?: EditorKind) {
  if (kind === "recover") {
    return "入池前请确认节点已修复并完成验收。系统将 uncordon 并清除故障标记，节点重新参与 Volcano 调度。";
  }
  return "隔离会 cordon 节点并标记故障，之后不再承接新训练任务；运行中任务不会自动迁移，请按需停止或等待结束。";
}

function QuotaImpactHint({
  loading,
  failed,
  impact,
  dcName,
}: {
  loading: boolean;
  failed: boolean;
  impact?: NodeQuotaImpact;
  dcName: (code: string) => string;
}) {
  if (loading) {
    return <p className="modal-maint-quota is-muted">正在核算隔离对队列额度的影响…</p>;
  }
  if (failed) {
    return <p className="modal-maint-quota is-warning">无法预估额度影响，仍可继续隔离。</p>;
  }
  if (!impact?.changed) {
    return null;
  }
  const lines = quotaImpactLines(impact, dcName);
  return (
    <div className={`modal-maint-quota ${impact.overAllocated ? "is-danger" : "is-warning"}`} role="alert">
      <p className="modal-maint-quota-title">
        {impact.overAllocated ? "隔离后可调度容量将低于已划分给队列的额度" : "隔离后队列可调度额度将下降"}
      </p>
      <ul className="modal-maint-quota-list">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function quotaImpactLines(impact: NodeQuotaImpact, dcName: (code: string) => string) {
  const lines: string[] = [];
  impact.datacenters.forEach((dc) => {
    const name = dcName(dc.datacenterCode);
    dc.gpuTypes.forEach((gpu) => {
      lines.push(quotaChangeLine(`${name} · ${gpu.type}`, "GPU", gpu.current, gpu.after, gpu.allocated, "卡", gpu.after < gpu.allocated));
    });
    if (dc.cpuCurrent !== dc.cpuAfter) {
      lines.push(quotaChangeLine(name, "CPU", dc.cpuCurrent, dc.cpuAfter, dc.cpuAllocated, "核", dc.cpuAfter < dc.cpuAllocated));
    }
    if (dc.memCurrentGi !== dc.memAfterGi) {
      lines.push(quotaChangeLine(name, "内存", dc.memCurrentGi, dc.memAfterGi, dc.memAllocated, "Gi", dc.memAfterGi < dc.memAllocated));
    }
  });
  return lines;
}

function quotaChangeLine(scope: string, resource: string, current: number, after: number, allocated: number, unit: string, over: boolean) {
  const base = `${scope}：${resource} ${current} ${unit} → ${after} ${unit}，队列已划分 ${allocated} ${unit}`;
  if (!over) {
    return base;
  }
  return `${base}，隔离后将超额 ${allocated - after} ${unit}`;
}

function maintNodeLine(editor: Editor, lookup: (name: string) => ClusterNode | undefined) {
  if (!editor) return "";
  if (editor.names.length === 1) {
    const n = lookup(editor.names[0]);
    return n?.ip ? `${editor.names[0]} · ${n.ip}` : editor.names[0];
  }
  const show = editor.names.slice(0, 8);
  const more = editor.names.length - show.length;
  let line = show
    .map((name) => {
      const n = lookup(name);
      return n?.ip ? `${name} (${n.ip})` : name;
    })
    .join(" · ");
  if (more > 0) line += ` · +${more} 台`;
  return line;
}

function kubectlStatus(n: ClusterNode) {
  const parts = [n.ready ? "Ready" : "NotReady", ...n.conditions.filter((c) => c !== "Ready")];
  if (!n.schedulable || n.isolated) parts.push("SchedulingDisabled");
  return [...new Set(parts)].join(",") || n.status;
}

function yamlScalar(v: string | number | boolean) {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  const s = String(v);
  if (s === "") return '""';
  if (/^[A-Za-z0-9_./:-]+$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s)) return s;
  return JSON.stringify(s);
}

function buildNodeYaml(n: ClusterNode, clusterName?: string) {
  const lines: string[] = [];
  const push = (indent: number, text: string) => lines.push(`${"  ".repeat(indent)}${text}`);
  push(0, "apiVersion: v1");
  push(0, "kind: Node");
  push(0, "metadata:");
  push(1, `name: ${yamlScalar(n.name)}`);
  push(1, "labels:");
  const keys = Object.keys(n.labels).sort();
  if (keys.length) {
    keys.forEach((k) => push(2, `${k}: ${n.labels[k] === "" ? '""' : yamlScalar(n.labels[k])}`));
  } else {
    push(2, "{}");
  }
  push(0, "spec:");
  push(1, `unschedulable: ${!n.schedulable || n.isolated ? "true" : "false"}`);
  if (n.taints.length) {
    push(1, "taints:");
    n.taints.forEach((t) => {
      push(2, `- key: ${yamlScalar(t.key)}`);
      if (t.value) push(3, `value: ${yamlScalar(t.value)}`);
      push(3, `effect: ${yamlScalar(t.effect || "NoSchedule")}`);
    });
  } else {
    push(1, "taints: []");
  }
  push(0, "status:");
  push(1, "addresses:");
  push(2, "- type: InternalIP");
  push(3, `address: ${yamlScalar(n.ip || "0.0.0.0")}`);
  push(2, "- type: Hostname");
  push(3, `address: ${yamlScalar(n.name)}`);
  push(1, "capacity:");
  push(2, `cpu: ${yamlScalar(String(milliToCores(n.cpuTotalMilli) || 0))}`);
  push(2, `memory: ${yamlScalar(`${Math.round(bytesToGi(n.memTotalBytes) * 1024)}Mi`)}`);
  push(2, `pods: ${yamlScalar(String(n.podCapacity))}`);
  push(2, `nvidia.com/gpu: ${yamlScalar(String(n.gpuTotal))}`);
  lines.push("");
  lines.push("# Platform extensions (not part of core Node API)");
  lines.push(`# cluster: ${clusterName || "-"}`);
  lines.push(`# datacenter: ${n.datacenter || "unset"}`);
  lines.push(`# gpuType: ${n.gpuType || "-"}`);
  lines.push(`# hasIB: ${n.hasIB ? "true" : "false"}`);
  lines.push(`# isolateState: ${n.isolated ? "isolated" : "healthy"}`);
  return lines.join("\n");
}

function actionLabel(action: string) {
  const map: Record<string, string> = { isolate: "隔离", recover: "入池", "set-dc": "数据中心", labels: "标签", taints: "污点" };
  return map[action] || action;
}

function actionBadgeClass(action: string) {
  if (action === "isolate") return "badge-warning";
  if (action === "recover") return "badge-success";
  return "badge-info";
}

function nodeStatusText(node: ClusterNode) {
  const parts = [node.ready ? "Ready" : "NotReady"];
  if (!node.schedulable) parts.push("SchedulingDisabled");
  return parts.join(",");
}

function NodeStatusBadge({ node }: { node: ClusterNode }) {
  const text = nodeStatusText(node);
  const cls = !node.ready ? "badge-danger" : node.schedulable ? "badge-healthy" : "badge-warning";
  return (
    <span className={`badge ${cls} node-k8s-status`} title={text}>
      {text}
    </span>
  );
}

const NODE_CONDITION_TYPES = ["Ready", "MemoryPressure", "DiskPressure", "PIDPressure", "NetworkUnavailable"] as const;

function NodeConditionTags({ node }: { node: ClusterNode }) {
  const abnormal = new Set(node.conditions);
  return (
    <>
      {NODE_CONDITION_TYPES.map((type) => {
        const on = type === "Ready" ? node.ready : abnormal.has(type);
        const cls = type === "Ready" ? (on ? "badge-healthy" : "badge-danger") : on ? "badge-warning" : "badge-info";
        return (
          <span key={type} className={`badge ${cls}`} title={`${type}=${on ? "True" : "False"}`}>
            {type}={on ? "True" : "False"}
          </span>
        );
      })}
    </>
  );
}

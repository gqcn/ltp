import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { cancelJob, getJob, getJobLogs, listJobAlerts, listJobPods, type EnvEntry } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeViewer, codeLangFromPath } from "@/components/CodeEditor";
import { ListLoading } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { DcBadge } from "@/components/UsageCell";
import { formatDuration, formatTime } from "@/lib/format";
import { formatBytes, formatMemGi, JobPriorityBadge, JobStatusBadge, isActiveJob } from "@/lib/job";
import { toast } from "@/lib/toast";

const tabs = [
  { id: "config", label: "配置信息" },
  { id: "pods", label: "Pod 列表" },
  { id: "metrics", label: "任务监控" },
  { id: "alerts", label: "关联告警" },
  { id: "logsearch", label: "日志检索" },
] as const;

function TabIcon({ id }: { id: string }) {
  if (id === "config") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6M8 9h2" /></svg>;
  }
  if (id === "pods") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="7" height="16" rx="1" /><rect x="14" y="4" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="6" rx="1" /></svg>;
  }
  if (id === "metrics") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5M4 19h16" /><path d="M8 16l3-5 3 3 5-8" /></svg>;
  }
  if (id === "alerts") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
  }
  return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
}

export function JobDetailPage() {
  const { id } = useParams();
  const jobId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("config");
  const [podName, setPodName] = useState("");
  const [stopOpen, setStopOpen] = useState(false);
  const [openFile, setOpenFile] = useState("");
  const [follow, setFollow] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const jobQuery = useQuery({ queryKey: ["training-job", jobId], queryFn: () => getJob(jobId), enabled: jobId > 0 });
  const podsQuery = useQuery({ queryKey: ["training-job-pods", jobId], queryFn: () => listJobPods(jobId), enabled: jobId > 0 && tab === "pods" });
  const alertsQuery = useQuery({ queryKey: ["training-job-alerts", jobId], queryFn: () => listJobAlerts(jobId), enabled: jobId > 0 });
  const pods = podsQuery.data?.list ?? [];
  const selectedPod = podName || pods[0]?.name || "";
  const selected = pods.find((p) => p.name === selectedPod);
  const logsQuery = useQuery({
    queryKey: ["training-job-logs", jobId, selectedPod],
    queryFn: () => getJobLogs(jobId, selectedPod),
    enabled: tab === "pods" && Boolean(selectedPod),
    refetchInterval: tab === "pods" && follow && Boolean(selectedPod) ? 3000 : false,
  });
  const job = jobQuery.data;
  const nodeCount = useMemo(() => new Set(pods.map((p) => p.node).filter(Boolean)).size, [pods]);
  const runningCount = pods.filter((p) => p.phase === "Running").length;
  const logText = logsQuery.data?.content || "";

  useEffect(() => {
    if (!follow || tab !== "pods") return;
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [follow, tab, logText]);

  const stopMutation = useMutation({
    mutationFn: () => cancelJob(jobId),
    onSuccess: async () => {
      toast.success("已停止任务");
      setStopOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["training-job", jobId] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "停止失败"),
  });

  if (jobQuery.isLoading) {
    return <div className="card" style={{ margin: 24 }}><ListLoading label="正在加载任务详情…" /></div>;
  }
  if (!job) {
    return <section className="page active"><div className="empty-state">任务不存在</div></section>;
  }

  const shortPod = selectedPod ? selectedPod.replace(`${job.name}-`, "") : "";
  const logMeta = selected
    ? [selectedPod, selected.role, `rank ${selected.index}`, selected.node || "—"].filter(Boolean).join(" · ")
    : selectedPod || "—";

  return (
    <section className="page active" id="page-job-detail">
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div className="job-detail-heading">
            <h2>
              <span className="job-detail-title">{job.name}</span>
              <JobStatusBadge status={job.status} />
            </h2>
            {job.failReason ? <div className="detail-fail-banner"><strong>失败原因</strong><span>{job.failReason}</span></div> : null}
            {job.experimentId ? (
              <div className="job-exp-banner">
                <div className="job-exp-banner-main">
                  <div className="job-exp-banner-label">关联实验</div>
                  <button type="button" className="link-cell" onClick={() => navigate(`/training/experiments/${job.experimentId}`)}>{job.experimentName || `Run #${job.experimentId}`}</button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="page-actions">
            {isActiveJob(job.status) ? (
              <Button variant="danger" size="sm" onClick={() => setStopOpen(true)}>停止任务</Button>
            ) : (
              <Button size="sm" onClick={() => navigate(`/training/jobs/new?rerun=${job.id}`)}>重跑</Button>
            )}
          </div>
        </div>
        <div className="detail-meta">
          <div className="meta-item"><div className="label">创建人</div><div className="value">{job.ownerNickname} <span className="mono text-muted">{job.ownerUsername}</span></div></div>
          {job.submittedByUsername && job.submittedByUsername !== job.ownerUsername ? (
            <div className="meta-item"><div className="label">提交人</div><div className="value">{job.submittedByNickname}</div></div>
          ) : null}
          <div className="meta-item"><div className="label">优先级</div><div className="value"><JobPriorityBadge priority={job.priority} /></div></div>
          <div className="meta-item"><div className="label">创建时间</div><div className="value mono">{formatTime(job.createdAt)}</div></div>
          <div className="meta-item"><div className="label">启动时间</div><div className="value mono">{formatTime(job.startedAt)}</div></div>
          <div className="meta-item"><div className="label">结束时间</div><div className="value mono">{formatTime(job.endedAt)}</div></div>
          <div className="meta-item"><div className="label">运行时长</div><div className="value mono">{formatDuration(job.durationMs)}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="tabs" id="job-detail-tabs">
          {tabs.map((item) => (
            <div key={item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
              <TabIcon id={item.id} />
              {item.label}
              {item.id === "alerts" ? <span className={`tab-count ${(alertsQuery.data?.list.length ?? 0) === 0 ? "is-zero" : ""}`}>{alertsQuery.data?.list.length ?? 0}</span> : null}
            </div>
          ))}
        </div>
        {tab === "config" ? (
          <div className="tab-panel active job-cfg">
            <div className="job-cfg-grid">
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">任务与资源</div>
                <div className="job-cfg-facts">
                  <div className="job-cfg-fact"><span className="k">任务名称</span><span className="v">{job.name}</span></div>
                  <div className="job-cfg-fact"><span className="k">运行用户</span><span className="v">{job.ownerNickname} <span className="mono text-muted">{job.ownerUsername}</span></span></div>
                  <div className="job-cfg-fact"><span className="k">团队</span><span className="v">{job.teamName}</span></div>
                  <div className="job-cfg-fact"><span className="k">队列</span><span className="v">{job.queueDisplayName}</span></div>
                  <div className="job-cfg-fact"><span className="k">优先级</span><span className="v"><JobPriorityBadge priority={job.priority} /></span></div>
                  <div className="job-cfg-fact"><span className="k">数据中心</span><span className="v"><DcBadge code={job.datacenterCode} name={job.datacenterName} shortName={job.datacenterShortName} color={job.datacenterColor} /></span></div>
                  <div className="job-cfg-fact"><span className="k">使用 IB</span><span className="v"><span className={`summary-yesno ${job.requireIb ? "is-yes" : "is-no"}`}>{job.requireIb ? "是" : "否"}</span></span></div>
                  <div className="job-cfg-fact is-span">
                    <span className="k">资源</span>
                    <span className="v">
                      <span className="job-cfg-res">
                        <span className="job-cfg-res-item">{job.nodes} 节点</span>
                        <span className="job-cfg-res-item">{job.gpusPerNode} GPU/节点</span>
                        <span className="job-cfg-res-item">{job.gpuCount} × {job.gpuType}</span>
                        <span className="job-cfg-res-item">CPU {job.cpuPerNode * job.nodes}</span>
                        <span className="job-cfg-res-item">{formatMemGi(job.memGiPerNode * job.nodes)}</span>
                      </span>
                    </span>
                  </div>
                  {job.rerunFromId ? <div className="job-cfg-fact is-span"><span className="k">重跑自</span><span className="v mono">{job.rerunFromId}</span></div> : null}
                </div>
              </section>
              <section className="job-cfg-panel job-cfg-launch">
                <div className="job-cfg-panel-head">启动命令</div>
                <CodeViewer
                  className="job-cfg-cmd"
                  language="shell"
                  value={job.command.trim() ? job.command : "# 无启动命令"}
                  lineNumbers={false}
                  wrap
                  aria-label="启动命令"
                />
                <div className="job-cfg-panel-head job-cfg-subhead">环境变量</div>
                <CodeViewer
                  className="job-cfg-env"
                  language="env"
                  value={formatEnv(job.env)}
                  lineNumbers={false}
                  wrap
                  aria-label="环境变量"
                />
              </section>
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">镜像地址</div>
                <div className="job-cfg-path"><code className="v">{job.image}</code></div>
              </section>
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">工作路径</div>
                <div className="job-cfg-path"><code className="v">{job.workdir}</code></div>
              </section>
              <section className="job-cfg-panel job-cfg-span">
                <div className="job-cfg-panel-head">配置挂载</div>
                {job.mounts?.length ? (
                  <div className="job-cfg-mounts">
                    {job.mounts.map((m) => (
                      <div key={`${m.setId}-${m.version}`} className="job-cfg-mount">
                        <div className="job-cfg-mount-title">
                          <strong>{m.displayName}</strong>
                          <span className="mono text-muted">v{m.version}</span>
                        </div>
                        <code className="job-cfg-mount-path" title={m.mountPath}>{m.mountPath}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="job-cfg-empty">未挂载配置集 · 启动路径来自镜像或共享盘</div>
                )}
              </section>
            </div>
            {job.mounts?.length ? (
              <div className="cfg-snapshot-list">
                {job.mounts.map((m, idx) => (
                  <div key={`${m.setId}-${m.version}-snap`} className="cfg-snapshot-card">
                    <div className="cfg-snapshot-head">
                      <h4>{m.displayName} <span className="mono text-muted">v{m.version}</span></h4>
                      <div className="cfg-snapshot-meta">
                        <span className="badge badge-info">configmap</span>
                        {m.digest ? <span className="tag mono">{m.digest.slice(0, 8)}</span> : null}
                        <span className="mono text-muted">{m.mountPath}</span>
                      </div>
                    </div>
                    <div className="card-body flush">
                      <table className="table cfg-snapshot-files">
                        <thead>
                          <tr>
                            <th>路径</th>
                            <th>大小</th>
                            <th className="th-actions">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(m.files || []).map((f, fi) => {
                            const key = `${idx}:${fi}`;
                            const open = openFile === key;
                            return (
                              <Fragment key={f.path}>
                                <tr>
                                  <td className="mono">{f.path}</td>
                                  <td className="mono">{formatBytes(f.size || f.content?.length || 0)}</td>
                                  <td className="td-actions">
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenFile(open ? "" : key)}>
                                      {open ? "收起" : "展开"}
                                    </button>
                                  </td>
                                </tr>
                                {open ? (
                                  <tr>
                                    <td colSpan={3}>
                                      <CodeViewer
                                        language={codeLangFromPath(f.path)}
                                        value={f.content}
                                        lineNumbers
                                        wrap={false}
                                        aria-label={`${f.path} 快照`}
                                      />
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {tab === "pods" ? (
          <div className="tab-panel active">
            <div className="pod-log-split">
              <div className="pod-log-pane pod-log-pane-left">
                <div className="pod-log-pane-head">
                  <div>
                    <div className="pod-log-pane-title">Pod 列表</div>
                    <div className="pod-log-pane-sub">
                      共 {pods.length} · Running {runningCount} · 节点 {nodeCount}
                    </div>
                  </div>
                </div>
                <div className="pod-log-list">
                  {pods.map((p, idx) => (
                    <div key={p.name} className={`pod-row ${p.name === selectedPod ? "selected" : ""}`} onClick={() => setPodName(p.name)}>
                      <div className="pod-row-top">
                        <span className="pod-row-idx mono">{idx}</span>
                        <span className="pod-row-name mono">{p.name.replace(`${job.name}-`, "")}</span>
                        <span className={`badge ${podPhaseClass(p.phase)}`}>{p.phase}</span>
                      </div>
                      <div className="pod-row-meta">
                        <span className="tag">{p.role}</span>
                        <span className="tag mono">rank {p.index}</span>
                        <span className="mono text-muted">{p.node || "—"}</span>
                        <span className="text-muted">重启 {p.restarts ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  {!pods.length ? <div className="empty-state">暂无 Pod</div> : null}
                </div>
              </div>
              <div className="pod-log-pane pod-log-pane-right">
                <div className="pod-log-pane-head">
                  <div className="pod-log-head-copy">
                    <div className="pod-log-pane-title">进程日志</div>
                    <div className="pod-log-pane-sub is-mono" title={logMeta}>{logMeta}</div>
                  </div>
                  <div className="pod-log-actions pod-log-toolbar">
                    <label className="pod-log-follow flex-center gap-8 text-muted">
                      <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
                      跟随
                    </label>
                    <Button variant="secondary" size="sm" onClick={() => logsQuery.refetch()}>刷新</Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${shortPod || selectedPod || "pod"}.log`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>下载</Button>
                  </div>
                </div>
                <div className="log-panel pod-log-panel">
                  <div className="log-lines" ref={logRef}>
                    {renderLogLines(logText)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {tab === "metrics" ? (
          <div className="tab-panel active">
            <div className="job-detail-placeholder">任务监控将对接 Prometheus，并在此嵌入 Grafana 看板。本迭代暂不查询监控数据。</div>
          </div>
        ) : null}
        {tab === "alerts" ? (
          <div className="tab-panel active">
            {(alertsQuery.data?.list ?? []).length ? (
              <table className="table">
                <thead><tr><th>告警</th><th>级别</th><th>状态</th><th>节点</th></tr></thead>
                <tbody>
                  {alertsQuery.data!.list.map((a) => (
                    <tr key={a.id}>
                      <td>{a.title}<div className="mono text-muted">{a.displayId}</div></td>
                      <td>{a.severity}</td>
                      <td>{a.status}</td>
                      <td className="mono">{a.nodeNames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-state">没有关联告警</div>}
          </div>
        ) : null}
        {tab === "logsearch" ? (
          <div className="tab-panel active">
            <div className="job-detail-placeholder">日志检索将对接 Elasticsearch。本迭代暂不提供跨 Pod 关键词搜索，请使用「Pod 列表」查看容器日志。</div>
          </div>
        ) : null}
      </div>
      <Modal open={stopOpen} title="停止任务" confirmText="停止" confirmVariant="danger" onClose={() => setStopOpen(false)} onConfirm={() => stopMutation.mutate()}>
        <p className="modal-msg">停止后训练进程将被终止，已占用 GPU 资源将释放。未落盘的进度可能丢失，此操作不可撤销。</p>
      </Modal>
    </section>
  );
}

function podPhaseClass(phase: string) {
  if (phase === "Running") return "badge-running";
  if (phase === "Failed") return "badge-failed";
  if (phase === "Succeeded") return "badge-success";
  return "badge-starting";
}

function formatEnv(env: EnvEntry[] | undefined) {
  if (!env?.length) return "# 无额外环境变量";
  return env.map((item) => `${item.key}=${item.value}`).join("\n");
}

function renderLogLines(content: string): ReactNode {
  const text = content.replace(/\s+$/, "");
  if (!text) {
    return <div className="log-line"><span className="log-msg text-muted">没有匹配的进程日志</span></div>;
  }
  return text.split("\n").map((line, i) => {
    const structured = line.match(/^(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(r\d+)\s+(INFO|WARN|WARNING|ERROR|DEBUG)\b\s*(.*)$/i);
    if (structured) {
      const level = structured[3].toLowerCase().startsWith("warn") ? "warn" : structured[3].toLowerCase();
      return (
        <div className="log-line" key={i}>
          <span className="log-ts">{structured[1]}</span>
          <span className="log-rank">{structured[2]}</span>
          <span className={`log-level ${level}`}>{structured[3].toUpperCase() === "WARNING" ? "WARN" : structured[3].toUpperCase()}</span>
          <span className="log-msg">{structured[4]}</span>
        </div>
      );
    }
    return (
      <div className="log-line" key={i}>
        <span className="log-msg">{line || " "}</span>
      </div>
    );
  });
}

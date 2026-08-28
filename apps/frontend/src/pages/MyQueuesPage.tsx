import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyQueues } from "@/api/training";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { DcBadge } from "@/components/UsageCell";
import { formatGpuHours, formatMemGi, formatMemPair, JobStatusBadge } from "@/lib/job";
import { quotaBarClass } from "@/lib/resources";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

export function MyQueuesPage() {
  const navigate = useNavigate();
  const { clusterId, loading } = useWorkingCluster("training");
  const query = useQuery({
    queryKey: ["training-my-queues", clusterId],
    queryFn: () => listMyQueues(clusterId!),
    enabled: Boolean(clusterId),
  });
  const summary = query.data?.summary;
  const items = query.data?.list ?? [];
  const gpuFree = Math.max(0, (summary?.gpuQuota ?? 0) - (summary?.gpuUsed ?? 0));

  return (
    <section className="page active" id="page-my-queues">
      <div className="page-header">
        <div>
          <h1>我的队列</h1>
          <p className="desc">我可使用的资源队列 · 查看 GPU / CPU / 内存额度与占用 · 卡时按「GPU 数 × 运行时长」累计，后续可用于训练任务成本核算</p>
        </div>
      </div>
      <div className="mb-16">
        <div className="stats-grid stats-grid-5 my-queues-stats">
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--success)" }}>
            <div className="stat-label">剩余 GPU</div>
            <div className={`stat-value ${gpuFree === 0 ? "text-danger" : "text-success"}`}>{gpuFree}</div>
            <div className="stat-meta">已用 {summary?.gpuUsed ?? 0} / {summary?.gpuQuota ?? 0} 卡</div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--primary)" }}>
            <div className="stat-label">剩余 CPU</div>
            <div className="stat-value">{Math.max(0, (summary?.cpuQuota ?? 0) - (summary?.cpuUsed ?? 0))}</div>
            <div className="stat-meta">已用 {summary?.cpuUsed ?? 0} / {summary?.cpuQuota ?? 0} 核</div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--purple)" }}>
            <div className="stat-label">剩余内存</div>
            <div className="stat-value">{Math.max(0, (summary?.memQuotaGi ?? 0) - (summary?.memUsedGi ?? 0))}</div>
            <div className="stat-meta">已用 {summary?.memUsedGi ?? 0} / {summary?.memQuotaGi ?? 0} Gi</div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--accent)" }}>
            <div className="stat-label">本月卡时</div>
            <div className="stat-value">{formatGpuHours(summary?.gpuHoursMonth ?? 0)}</div>
            <div className="stat-meta">运行中 {formatGpuHours(summary?.gpuHoursRunning ?? 0)} · 可核算成本</div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--warning)" }}>
            <div className="stat-label">活跃任务</div>
            <div className="stat-value">{(summary?.running ?? 0) + (summary?.pending ?? 0)}</div>
            <div className="stat-meta">运行 {summary?.running ?? 0} · 排队 {summary?.pending ?? 0}</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          <ListBody loading={loading || query.isLoading} loadingLabel="正在加载队列…" errorLabel="加载失败" emptyLabel="" empty={false} error={query.isError}>
            {!items.length ? (
              <div className="empty-state" style={{ padding: 48 }}>
                当前账号未关联任何资源队列。<br />
                <span className="text-muted" style={{ fontSize: 12.5 }}>请联系管理员将你加入团队，并在团队中绑定队列。</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table my-queues-table">
                  <thead>
                    <tr>
                      <th>队列</th>
                      <th>团队</th>
                      <th>数据中心</th>
                      <th>GPU</th>
                      <th>GPU 额度</th>
                      <th>本月卡时</th>
                      <th>CPU / 内存</th>
                      <th>功能特性</th>
                      <th>运行/排队</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((q) => {
                      const free = Math.max(0, q.gpuQuota - q.gpuUsed);
                      const pct = q.gpuQuota ? Math.min(100, Math.round((q.gpuUsed / q.gpuQuota) * 100)) : 0;
                      return (
                        <Fragment key={q.id}>
                          <tr className={`my-queue-row ${q.enabled ? "" : "is-disabled-row"}${q.activeJobs.length ? " has-jobs" : ""}`}>
                            <td className="my-queue-name-cell"><strong>{q.displayName}</strong></td>
                            <td className="my-queue-team-cell">{q.teams.length ? q.teams.map((t) => <span key={t.id} className="tag tag-soft">{t.name}</span>) : <span className="text-muted">—</span>}</td>
                            <td><DcBadge code={q.datacenterCode} /></td>
                            <td className="my-queue-gpu-type">{q.gpuType}</td>
                            <td className="my-queue-gpu-cell">
                              <div className="my-queue-quota-line">{q.gpuUsed}/{q.gpuQuota} · 余 <strong className={free ? "text-success" : "text-danger"}>{free}</strong></div>
                              <div className="progress mt-8" style={{ height: 6 }}><div className={`progress-bar ${quotaBarClass(pct)}`} style={{ width: `${pct}%` }} /></div>
                            </td>
                            <td className="my-queue-hours-cell">
                              <div className="my-queue-hours-line"><strong>{formatGpuHours(q.gpuHoursMonth)}</strong> <span className="text-muted">卡时</span></div>
                            </td>
                            <td className="my-queue-cpu-mem-cell mono">
                              <div className="my-queue-cpu-line">CPU {q.cpuUsed}/{q.cpuQuota}</div>
                              <div className="my-queue-mem-line">{formatMemPair(q.memUsedGi, q.memQuotaGi)}</div>
                            </td>
                            <td>{q.features.includes("ib") ? <span className="tag tag-ib">IB</span> : <span className="text-muted">—</span>}</td>
                            <td className="my-queue-active-cell">{q.running}<span className="text-muted"> / {q.pending}</span></td>
                            <td className="td-actions">
                              <div className="job-actions job-actions-stack">
                                <div className="job-actions-row">
                                  <Button size="sm" disabled={!q.enabled} onClick={() => navigate(`/training/jobs/new?queueId=${q.id}`)}>提交</Button>
                                </div>
                                <div className="job-actions-row">
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/training/jobs?queueId=${q.id}`)}>任务</Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {q.activeJobs.length ? (
                            <tr className="my-queue-job-row">
                              <td colSpan={10}>
                                <div className="my-queue-job-nest">
                                  {q.activeJobs.map((j) => (
                                    <div key={j.id} className="my-queue-job-item">
                                      <span className="my-queue-job-rail" aria-hidden="true" />
                                      <span className="link-cell my-queue-job-name" onClick={() => navigate(`/training/jobs/${j.id}`)}>{j.name}</span>
                                      <span className="my-queue-job-status"><JobStatusBadge status={j.status} /></span>
                                      <span className="my-queue-job-meta">{j.gpuCount} 卡 · {j.gpuType} · CPU {j.cpuTotal} · {formatMemGi(j.memGiTotal)}</span>
                                      <span className="my-queue-job-hours">{j.status === "queued" ? "—" : `${formatGpuHours(j.gpuHours)} 卡时`}</span>
                                      <span className="my-queue-job-owner">{j.ownerNickname}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ListBody>
        </div>
      </div>
    </section>
  );
}

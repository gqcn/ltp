import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cancelJob, listJobs, listTrainingTeams, type JobItem } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { Select } from "@/components/Select";
import { DcBadge } from "@/components/UsageCell";
import { formatLoss } from "@/lib/experiment";
import { formatDuration } from "@/lib/format";
import { CreatedAtCell, JobPriorityBadge, JobResourceCell, JobStatusBadge, isActiveJob } from "@/lib/job";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

export function JobListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clusterId, loading: clustersLoading } = useWorkingCluster("training");
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [teamId, setTeamId] = useState(params.get("teamId") || "all");
  const [queueId, setQueueId] = useState(params.get("queueId") || "all");
  const node = params.get("node") || undefined;
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stopId, setStopId] = useState<JobItem | null>(null);

  const teamsQuery = useQuery({ queryKey: ["training-teams"], queryFn: listTrainingTeams });
  const listQuery = useQuery({
    queryKey: ["training-jobs", { clusterId, keyword, teamId, queueId, status, priority, node, page, pageSize }],
    queryFn: () =>
      listJobs({
        clusterId: clusterId!,
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        teamId: teamId === "all" ? undefined : Number(teamId),
        queueId: queueId === "all" ? undefined : Number(queueId),
        status,
        priority,
        node,
      }),
    enabled: Boolean(clusterId),
  });
  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const teams = teamsQuery.data?.list ?? [];
  const queues = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach((row) => map.set(row.queueId, row.queueDisplayName || row.queueName));
    return [...map.entries()];
  }, [rows]);

  const stopMutation = useMutation({
    mutationFn: (id: number) => cancelJob(id),
    onSuccess: async () => {
      toast.success("已停止任务");
      setStopId(null);
      await queryClient.invalidateQueries({ queryKey: ["training-jobs"] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "停止失败"),
  });

  return (
    <section className="page active" id="page-jobs">
      <div className="page-header">
        <div>
          <h1>任务列表</h1>
          <p className="desc">提交、查看与管理 Volcano 训练作业</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => navigate("/training/jobs/new")}>+ 新建训练任务</Button>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input placeholder="搜索任务名 / 创建人..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
        </div>
        <Select
          variant="filter"
          aria-label="按团队筛选"
          value={teamId}
          options={[{ value: "all", label: "全部团队" }, ...teams.map((t) => ({ value: String(t.id), label: t.name }))]}
          onChange={(next) => { setTeamId(next); setPage(1); }}
        />
        <Select
          variant="filter"
          aria-label="按队列筛选"
          value={queueId}
          options={[{ value: "all", label: "全部队列" }, ...queues.map(([id, name]) => ({ value: String(id), label: name }))]}
          onChange={(next) => { setQueueId(next); setPage(1); }}
        />
        <Select
          variant="filter"
          aria-label="按状态筛选"
          value={status}
          options={[
            { value: "all", label: "全部状态" },
            { value: "running", label: "运行中" },
            { value: "starting", label: "启动中" },
            { value: "queued", label: "排队中" },
            { value: "success", label: "成功" },
            { value: "failed", label: "失败" },
            { value: "cancelled", label: "已取消" },
          ]}
          onChange={(next) => { setStatus(next); setPage(1); }}
        />
        <Select
          variant="filter"
          aria-label="按优先级筛选"
          value={priority}
          options={[
            { value: "all", label: "全部优先级" },
            { value: "P0", label: "P0 最高" },
            { value: "P1", label: "P1 高" },
            { value: "P2", label: "P2 中" },
            { value: "P3", label: "P3 低" },
          ]}
          onChange={(next) => { setPriority(next); setPage(1); }}
        />
      </div>
      <div className="card">
        <div className="card-body flush">
          <ListBody loading={clustersLoading || listQuery.isLoading} loadingLabel="正在加载任务…" errorLabel="加载失败" emptyLabel="没有匹配的任务" empty={false} error={listQuery.isError}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>任务</th>
                    <th>状态</th>
                    <th>优先级</th>
                    <th>团队 / 队列</th>
                    <th>数据中心</th>
                    <th>资源</th>
                    <th>Loss</th>
                    <th>进度</th>
                    <th>时长</th>
                    <th>创建人</th>
                    <th className="th-created">创建时间</th>
                    <th className="th-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className="link-cell" role="link" tabIndex={0} onClick={() => navigate(`/training/jobs/${job.id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/training/jobs/${job.id}`)}>
                            {job.name}
                          </div>
                        </td>
                        <td><JobStatusBadge status={job.status} /></td>
                        <td><JobPriorityBadge priority={job.priority} /></td>
                        <td className="td-team-queue">
                          <div style={{ fontSize: 12.5 }}>{job.teamName || "—"}</div>
                          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{job.queueDisplayName || job.queueName}</div>
                        </td>
                        <td className="td-nowrap"><DcBadge code={job.datacenterCode} name={job.datacenterName} shortName={job.datacenterShortName} color={job.datacenterColor} /></td>
                        <td className="td-job-res">
                          <JobResourceCell
                            gpuCount={job.gpuCount}
                            gpuType={job.gpuType}
                            nodes={job.nodes}
                            cpuTotal={job.cpuPerNode * job.nodes}
                            memGiTotal={job.memGiPerNode * job.nodes}
                            ib={job.requireIb}
                          />
                        </td>
                        <td className="mono" title={job.loss == null ? undefined : String(job.loss)}>{formatLoss(job.loss)}</td>
                        <td className="mono">{job.step == null ? "—" : job.maxSteps ? `${job.step}/${job.maxSteps}` : String(job.step)}</td>
                        <td className="mono td-nowrap">{formatDuration(job.durationMs)}</td>
                        <td className="td-nowrap">{job.ownerNickname}</td>
                        <td className="mono text-muted td-created"><CreatedAtCell ms={job.createdAt} /></td>
                        <td className="td-actions">
                          <div className="job-actions">
                            {isActiveJob(job.status) ? (
                              <Button variant="danger" size="sm" title="停止该任务" onClick={() => setStopId(job)}>停止</Button>
                            ) : (
                              <Button variant="secondary" size="sm" data-recreate={job.id} title="基于当前配置重跑" onClick={() => navigate(`/training/jobs/new?rerun=${job.id}`)}>重跑</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12}><div className="empty-state">{clusterId ? "没有匹配的任务" : "请先在运维中心接入工作集群"}</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {listQuery.isLoading ? null : <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          </ListBody>
        </div>
      </div>
      <Modal open={Boolean(stopId)} title="停止任务" confirmText="停止" confirmVariant="danger" onClose={() => setStopId(null)} onConfirm={() => stopId && stopMutation.mutate(stopId.id)}>
        <p className="modal-msg">停止后训练进程将被终止，已占用 GPU 资源将释放。未落盘的进度可能丢失，此操作不可撤销。</p>
        {stopId ? <p className="mono text-muted">{stopId.name}</p> : null}
      </Modal>
    </section>
  );
}

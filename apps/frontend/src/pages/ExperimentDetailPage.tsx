import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { deleteExperimentRun, getExperimentRun, listExperimentProjects, openExperimentBoard, updateExperimentRun } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeViewer } from "@/components/CodeEditor";
import { ListLoading } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { formatTime } from "@/lib/format";
import { JobStatusBadge } from "@/lib/job";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

const tabs = [
  { id: "charts", label: "TensorBoard / 曲线" },
  { id: "config", label: "超参配置" },
  { id: "overview", label: "概览与路径" },
] as const;

function dash(v: number | null | undefined) {
  return v == null ? "—" : String(v);
}

export function ExperimentDetailPage() {
  const { id } = useParams();
  const runId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clusterId } = useWorkingCluster("training");
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("charts");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveProjectId, setMoveProjectId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = useQuery({ queryKey: ["exp-run", runId], queryFn: () => getExperimentRun(runId), enabled: runId > 0 });
  const projectsQuery = useQuery({
    queryKey: ["exp-projects", clusterId],
    queryFn: () => listExperimentProjects(clusterId!),
    enabled: Boolean(clusterId),
  });
  const board = useMutation({
    mutationFn: () => openExperimentBoard(runId),
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "打开看板失败"),
  });
  const move = useMutation({
    mutationFn: (projectId: number) => updateExperimentRun(runId, projectId),
    onSuccess: async () => {
      toast.success("已移动实验");
      setMoveOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["exp-run", runId] });
      await queryClient.invalidateQueries({ queryKey: ["exp-projects"] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "移动失败"),
  });
  const remove = useMutation({
    mutationFn: () => deleteExperimentRun(runId),
    onSuccess: () => {
      toast.success("已删除实验");
      navigate("/training/experiments");
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "删除失败"),
  });
  const run = query.data;

  if (query.isLoading) {
    return <div className="card" style={{ margin: 24 }}><ListLoading label="正在加载实验…" /></div>;
  }
  if (!run) {
    return <section className="page active"><div className="empty-state">实验不存在</div></section>;
  }

  return (
    <section className="page active" id="page-exp-detail">
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div>
            <h2>{run.name} {run.jobStatus ? <JobStatusBadge status={run.jobStatus} /> : null}</h2>
            <div className="mono text-muted mt-8" style={{ fontSize: 12 }}>{run.projectName}</div>
          </div>
          <div className="page-actions">
            {run.jobId ? <Button variant="ghost" size="sm" onClick={() => navigate(`/training/jobs/${run.jobId}`)}>查看任务</Button> : null}
            <Button variant="secondary" size="sm" onClick={() => { setMoveProjectId(String(run.projectId)); setMoveOpen(true); }}>移动到项目</Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>删除实验</Button>
            <Button size="sm" onClick={() => board.mutate()}>打开 TensorBoard</Button>
          </div>
        </div>
        <div className="detail-meta">
          <div className="meta-item"><div className="label">创建人</div><div className="value">{run.ownerNickname}</div></div>
          <div className="meta-item"><div className="label">Loss</div><div className="value mono">{dash(run.loss)}</div></div>
          <div className="meta-item"><div className="label">Step</div><div className="value mono">{run.step == null ? "—" : run.maxSteps ? `${run.step.toLocaleString()} / ${run.maxSteps.toLocaleString()}` : run.step.toLocaleString()}</div></div>
          <div className="meta-item"><div className="label">吞吐</div><div className="value mono">{dash(run.tokensPerSec)}</div></div>
          <div className="meta-item"><div className="label">更新时间</div><div className="value mono">{formatTime(run.updatedAt)}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="tabs">
          {tabs.map((item) => (
            <div key={item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>{item.label}</div>
          ))}
        </div>
        {tab === "charts" ? (
          <div className="tab-panel active">
            <div className="exp-tb-embed">
              <div className="exp-tb-embed-main">
                <div className="exp-tb-badge">主路径</div>
                <h4>TensorBoard 看板</h4>
                <p className="text-muted">完整曲线由任务所在机房的 TensorBoard 提供。平台按需拉起进程并反代，不把 tfevents 导入数据库。</p>
                {board.data?.ready ? (
                  <iframe title="TensorBoard" src={board.data.proxyPath} style={{ width: "100%", minHeight: 480, border: 0, background: "var(--bg-1)" }} />
                ) : (
                  <div className="exp-tb-embed-actions">
                    <Button size="sm" onClick={() => board.mutate()} disabled={board.isPending}>打开 / 嵌入 TensorBoard</Button>
                    {board.data?.proxyPath ? <Button variant="secondary" size="sm" onClick={() => window.open(board.data?.proxyPath, "_blank")}>新标签打开</Button> : null}
                    {board.data?.message ? <span className="text-muted">{board.data.message}</span> : null}
                  </div>
                )}
              </div>
            </div>
            {run.metricsError ? <div className="exp-panel-note text-muted">{run.metricsError}</div> : null}
          </div>
        ) : null}
        {tab === "config" ? (
          <div className="tab-panel active exp-config-grid">
            <div className="exp-config-card">
              <h4>任务配置</h4>
              <div className="card-body">
                <div className="kv-list">
                  <div className="kv-row"><span className="k">镜像</span><span className="v mono">{run.image || "—"}</span></div>
                  <div className="kv-row"><span className="k">节点</span><span className="v">{run.nodes || "—"}</span></div>
                  <div className="kv-row"><span className="k">每节点 GPU</span><span className="v">{run.gpusPerNode || "—"}</span></div>
                  <div className="kv-row"><span className="k">工作路径</span><span className="v mono">{run.workdir || "—"}</span></div>
                </div>
              </div>
            </div>
            <div className="exp-config-card">
              <h4>启动命令</h4>
              <div className="card-body">
                <CodeViewer language="shell" value={run.command || "# 无"} lineNumbers={false} wrap />
              </div>
            </div>
          </div>
        ) : null}
        {tab === "overview" ? (
          <div className="tab-panel active exp-config-grid">
            <div className="exp-config-card">
              <h4>TensorBoard logdir</h4>
              <div className="card-body">
                <CodeViewer language="shell" value={run.tbLogdir || "—"} lineNumbers={false} wrap />
                <div className="flex gap-8" style={{ marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(run.tbLogdir).then(() => toast.success("已复制 logdir"))}>复制 logdir</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Modal
        open={moveOpen}
        title="移动实验"
        onClose={() => setMoveOpen(false)}
        onConfirm={() => moveProjectId && move.mutate(Number(moveProjectId))}
        confirmText="移动"
        confirmDisabled={move.isPending || !moveProjectId || Number(moveProjectId) === run.projectId}
      >
        <p className="modal-lead">把「{run.name}」移动到另一个项目。</p>
        <div className="exp-move-list" role="listbox" aria-label="目标项目">
          {(projectsQuery.data?.list ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              className={`exp-move-item ${String(p.id) === moveProjectId ? "is-selected" : ""}`}
              onClick={() => setMoveProjectId(String(p.id))}
            >
              <span className="exp-move-item-name">{p.displayName || p.name}</span>
              <span className="exp-move-item-meta">{p.runCount} 个实验</span>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={deleteOpen}
        title="确认删除实验"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        confirmText="确认删除"
        confirmVariant="danger"
        confirmDisabled={remove.isPending}
      >
        <p className="modal-msg">确定要删除实验 <strong>{run.name}</strong> 吗？</p>
        <p className="modal-hint is-danger">删除后不再出现在实验列表。关联训练任务仍会保留。此操作不可撤销。</p>
      </Modal>
    </section>
  );
}

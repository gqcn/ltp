import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { deleteExperimentRun, getExperimentRun, listExperimentProjects, openExperimentBoard, updateExperimentRun, type EnvEntry } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeViewer } from "@/components/CodeEditor";
import { ListLoading } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { ExperimentProgress, formatLoss, formatTokensPerSec } from "@/lib/experiment";
import { formatTime } from "@/lib/format";
import { JobStatusBadge } from "@/lib/job";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

const tabs = [
  { id: "charts", label: "TensorBoard / 曲线" },
  { id: "config", label: "超参配置" },
  { id: "overview", label: "概览与路径" },
] as const;

function TabIcon({ id }: { id: string }) {
  if (id === "charts") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5M4 19h16" /><path d="M8 16l3-5 3 3 5-8" /></svg>;
  }
  if (id === "config") {
    return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6M8 9h2" /></svg>;
  }
  return <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16" /><path d="M8 16V8M12 16V4M16 16v-6" /></svg>;
}

function formatEnv(env: EnvEntry[] | undefined) {
  if (!env?.length) return "# 无额外环境变量";
  return env.map((item) => `${item.key}=${item.value}`).join("\n");
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
  const boardReady = Boolean(board.data?.ready);

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
          <div className="job-detail-heading">
            <h2>
              <span className="job-detail-title">{run.name}</span>
              {run.jobStatus ? <JobStatusBadge status={run.jobStatus} /> : null}
            </h2>
            <div className="exp-hero-project">{run.projectName}</div>
          </div>
          <div className="page-actions">
            {run.jobId ? <Button variant="secondary" size="sm" onClick={() => navigate(`/training/jobs/${run.jobId}`)}>查看任务</Button> : null}
            <Button variant="ghost" size="sm" onClick={() => { setMoveProjectId(String(run.projectId)); setMoveOpen(true); }}>移动到项目</Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>删除实验</Button>
            <Button size="sm" onClick={() => board.mutate()} disabled={board.isPending}>打开 TensorBoard</Button>
          </div>
        </div>
        <div className="detail-meta exp-hero-meta">
          <div className="meta-item">
            <div className="label">创建人</div>
            <div className="value">{run.ownerNickname}</div>
          </div>
          <div className="meta-item">
            <div className="label">Loss</div>
            <div className="value mono" title={run.loss == null ? undefined : String(run.loss)}>{formatLoss(run.loss)}</div>
          </div>
          <div className="meta-item">
            <div className="label">Step</div>
            <div className="value mono">
              <ExperimentProgress step={run.step} maxSteps={run.maxSteps} />
            </div>
          </div>
          <div className="meta-item">
            <div className="label">吞吐</div>
            <div className="value mono">
              {formatTokensPerSec(run.tokensPerSec)}
              {run.tokensPerSec != null ? <span className="exp-metric-unit">tok/s</span> : null}
            </div>
          </div>
          <div className="meta-item">
            <div className="label">更新时间</div>
            <div className="value mono">{formatTime(run.updatedAt)}</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="tabs">
          {tabs.map((item) => (
            <div key={item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
              <TabIcon id={item.id} />
              {item.label}
            </div>
          ))}
        </div>
        {tab === "charts" ? (
          <div className={`tab-panel active ${boardReady ? "exp-tb-panel-ready" : "exp-tb-panel"}`}>
            {boardReady ? (
              <div className="exp-tb-embed is-ready">
                <div className="exp-tb-chrome">
                  <span className="exp-tb-chrome-title">TensorBoard</span>
                  <Button variant="ghost" size="sm" onClick={() => window.open(board.data?.proxyPath, "_blank")}>新标签打开</Button>
                </div>
                <iframe title="TensorBoard" src={board.data?.proxyPath} className="exp-tb-frame" />
              </div>
            ) : (
              <div className="exp-tb-launch">
                <svg className="exp-tb-launch-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <rect x="6" y="8" width="36" height="32" rx="6" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M12 32l7.5-9 6 5 10-14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="35.5" cy="14" r="1.6" fill="currentColor" />
                </svg>
                <h4>TensorBoard 看板</h4>
                <p className="text-muted">在任务所在机房按需打开 TensorBoard，查看完整训练曲线。</p>
                <div className="exp-tb-embed-actions">
                  <Button size="sm" onClick={() => board.mutate()} disabled={board.isPending}>打开 / 嵌入 TensorBoard</Button>
                  {board.data?.proxyPath ? <Button variant="secondary" size="sm" onClick={() => window.open(board.data?.proxyPath, "_blank")}>新标签打开</Button> : null}
                  {board.data?.message ? <span className="text-muted">{board.data.message}</span> : null}
                </div>
              </div>
            )}
            {run.metricsError ? <div className="exp-panel-note text-muted">{run.metricsError}</div> : null}
          </div>
        ) : null}
        {tab === "config" ? (
          <div className="tab-panel active job-cfg">
            <div className="job-cfg-grid">
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">任务配置</div>
                <div className="job-cfg-facts">
                  <div className="job-cfg-fact is-span"><span className="k">镜像</span><span className="v mono">{run.image || "—"}</span></div>
                  <div className="job-cfg-fact"><span className="k">节点</span><span className="v">{run.nodes || "—"}</span></div>
                  <div className="job-cfg-fact"><span className="k">每节点 GPU</span><span className="v">{run.gpusPerNode || "—"}</span></div>
                  <div className="job-cfg-fact is-span"><span className="k">工作路径</span><span className="v mono">{run.workdir || "—"}</span></div>
                </div>
              </section>
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">启动命令</div>
                <CodeViewer language="shell" value={run.command || "# 无"} lineNumbers={false} wrap />
                <div className="job-cfg-panel-head job-cfg-subhead">环境变量</div>
                <CodeViewer language="env" value={formatEnv(run.env)} lineNumbers={false} wrap />
              </section>
            </div>
          </div>
        ) : null}
        {tab === "overview" ? (
          <div className="tab-panel active job-cfg">
            <div className="job-cfg-grid">
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">实验信息</div>
                <div className="job-cfg-facts">
                  <div className="job-cfg-fact"><span className="k">项目</span><span className="v">{run.projectName || "—"}</span></div>
                  <div className="job-cfg-fact"><span className="k">团队</span><span className="v">{run.teamName || "—"}</span></div>
                  <div className="job-cfg-fact is-span">
                    <span className="k">关联任务</span>
                    <span className="v">
                      {run.jobId ? (
                        <button type="button" className="link-cell" onClick={() => navigate(`/training/jobs/${run.jobId}`)}>{run.jobName || run.jobId}</button>
                      ) : "—"}
                    </span>
                  </div>
                </div>
              </section>
              <section className="job-cfg-panel">
                <div className="job-cfg-panel-head">TensorBoard logdir</div>
                <div className="job-cfg-path">
                  <code className="v">{run.tbLogdir || "—"}</code>
                </div>
                {run.tbLogdir ? (
                  <div className="exp-tb-embed-actions">
                    <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(run.tbLogdir).then(() => toast.success("已复制 logdir"))}>复制 logdir</Button>
                  </div>
                ) : null}
              </section>
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

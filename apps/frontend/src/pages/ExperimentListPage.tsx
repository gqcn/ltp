import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createExperimentProject,
  deleteExperimentProject,
  deleteExperimentRun,
  listExperimentProjects,
  listExperimentRuns,
  updateExperimentProject,
  updateExperimentRun,
  type ExperimentProject,
  type ExperimentRun,
} from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { ListBody } from "@/components/ListLoading";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { Select } from "@/components/Select";
import { CreatedAtCell, JobStatusBadge } from "@/lib/job";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

const DEFAULT_PROJECT = "default";
const PROJECT_PAGE_SIZE = 10;

function projectPageOf(list: ExperimentProject[], id: number) {
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return 1;
  return Math.floor(idx / PROJECT_PAGE_SIZE) + 1;
}

function dash(v: number | null | undefined) {
  return v == null ? "—" : String(v);
}

function progressLabel(run: ExperimentRun) {
  if (run.step == null) return "—";
  if (run.maxSteps == null) return `step ${run.step.toLocaleString()}`;
  return `step ${run.step.toLocaleString()}/${run.maxSteps.toLocaleString()}`;
}

function projectLabel(p: ExperimentProject) {
  return p.displayName || p.name;
}

function isDefaultProject(p: ExperimentProject) {
  return p.name === DEFAULT_PROJECT;
}

export function ExperimentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clusterId, loading: clustersLoading } = useWorkingCluster("training");
  const [projectId, setProjectId] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projPage, setProjPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExperimentProject | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ExperimentProject | null>(null);
  const [moveTarget, setMoveTarget] = useState<ExperimentRun | null>(null);
  const [moveProjectId, setMoveProjectId] = useState("");
  const [runDeleteTarget, setRunDeleteTarget] = useState<ExperimentRun | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["exp-projects", clusterId],
    queryFn: () => listExperimentProjects(clusterId!),
    enabled: Boolean(clusterId),
  });
  const runsQuery = useQuery({
    queryKey: ["exp-runs", { clusterId, projectId, keyword, status, sort, page, pageSize }],
    queryFn: () =>
      listExperimentRuns({
        clusterId: clusterId!,
        pageNum: page,
        pageSize,
        projectId: projectId || undefined,
        keyword: keyword.trim() || undefined,
        status,
        sort,
      }),
    enabled: Boolean(clusterId),
  });
  const projects = projectsQuery.data?.list ?? [];
  const runs = runsQuery.data?.list ?? [];
  const total = runsQuery.data?.total ?? 0;
  const projTotalPages = Math.max(1, Math.ceil(projects.length / PROJECT_PAGE_SIZE) || 1);
  const pagedProjects = useMemo(() => {
    const current = Math.min(projPage, projTotalPages);
    const start = (current - 1) * PROJECT_PAGE_SIZE;
    return projects.slice(start, start + PROJECT_PAGE_SIZE);
  }, [projects, projPage, projTotalPages]);
  const allCount = useMemo(() => projects.reduce((s, p) => s + p.runCount, 0), [projects]);
  const currentProject = projects.find((p) => p.id === projectId) ?? null;
  const jobCreateHref = projectId > 0 ? `/training/jobs/new?projectId=${projectId}` : "/training/jobs/new";

  async function refreshExperiments() {
    await queryClient.invalidateQueries({ queryKey: ["exp-projects"] });
    await queryClient.invalidateQueries({ queryKey: ["exp-runs"] });
  }

  useEffect(() => {
    if (projPage > projTotalPages) setProjPage(projTotalPages);
  }, [projPage, projTotalPages]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateExperimentProject(editing.id, { name: formName.trim(), description: formDesc.trim() });
        return editing.id;
      }
      const created = await createExperimentProject({ name: formName.trim(), description: formDesc.trim() });
      return created.id;
    },
    onSuccess: async (id) => {
      toast.success(editing ? "项目已更新" : "项目已创建");
      setFormOpen(false);
      if (!clusterId) {
        await queryClient.invalidateQueries({ queryKey: ["exp-projects"] });
        return;
      }
      const data = await queryClient.fetchQuery({
        queryKey: ["exp-projects", clusterId],
        queryFn: () => listExperimentProjects(clusterId),
      });
      setProjPage(projectPageOf(data.list ?? [], id));
    },
    onError: (error: unknown) => setFormError(error instanceof ApiError ? error.message : "保存失败"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExperimentProject(id),
    onSuccess: async (_, id) => {
      toast.success("已删除项目");
      setDeleteTarget(null);
      if (projectId === id) setProjectId(0);
      await refreshExperiments();
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "删除失败"),
  });
  const moveMutation = useMutation({
    mutationFn: ({ id, projectId: next }: { id: number; projectId: number }) => updateExperimentRun(id, next),
    onSuccess: async () => {
      toast.success("已移动实验");
      setMoveTarget(null);
      await refreshExperiments();
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "移动失败"),
  });
  const deleteRunMutation = useMutation({
    mutationFn: (id: number) => deleteExperimentRun(id),
    onSuccess: async (_, id) => {
      toast.success("已删除实验");
      setRunDeleteTarget(null);
      setSelected((cur) => cur.filter((x) => x !== id));
      await refreshExperiments();
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "删除失败"),
  });

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(p: ExperimentProject) {
    setEditing(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormError("");
    setFormOpen(true);
  }
  function openMove(run: ExperimentRun) {
    setMoveTarget(run);
    setMoveProjectId(String(run.projectId || 0));
  }
  function toggleSelect(id: number) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));
  }
  function selectProject(id: number) {
    setProjectId(id);
    setPage(1);
  }

  const defaultBlocked = Boolean(deleteTarget && isDefaultProject(deleteTarget));

  return (
    <section className="page active" id="page-experiments">
      <div className="page-header">
        <div>
          <h1>实验分析</h1>
          <p className="desc">按项目浏览训练实验 · 对比超参与快照 · 打开机房内 TensorBoard</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate(jobCreateHref)}>
            新建训练任务
          </Button>
          <Button variant="secondary" disabled={selected.length < 2} onClick={() => navigate(`/training/experiments/compare?ids=${selected.join(",")}`)}>
            对比实验 ({selected.length})
          </Button>
        </div>
      </div>
      <div className="exp-layout">
        <aside className="exp-projects card">
          <div className="card-header exp-proj-header">
            <h3>项目</h3>
            <button type="button" className="btn btn-ghost btn-sm exp-proj-add" onClick={openCreate}>
              + 新建
            </button>
          </div>
          <div className="exp-project-list">
            <div className={`exp-project-item ${projectId === 0 ? "active" : ""}`} onClick={() => selectProject(0)}>
              <div className="exp-proj-body">
                <span className="exp-proj-name">全部项目</span>
                <span className="exp-proj-meta">{allCount} 个实验</span>
              </div>
            </div>
            {pagedProjects.map((p) => (
              <div key={p.id} className={`exp-project-item ${projectId === p.id ? "active" : ""}`} onClick={() => selectProject(p.id)}>
                <div className="exp-proj-body" title={projectLabel(p)}>
                  <span className="exp-proj-name">{projectLabel(p)}</span>
                  <span className="exp-proj-meta">{p.runCount} 个实验</span>
                </div>
              </div>
            ))}
          </div>
          <div className="exp-proj-pager" role="navigation" aria-label="项目分页">
            <Pagination compact page={Math.min(projPage, projTotalPages)} pageSize={PROJECT_PAGE_SIZE} total={projects.length} onPageChange={setProjPage} />
          </div>
        </aside>
        <div className="exp-main">
          {currentProject ? (
            <div className="exp-selected-head">
              <div className="exp-selected-copy">
                <div className="exp-selected-name">{projectLabel(currentProject)}</div>
                {currentProject.description ? <p className="exp-selected-desc">{currentProject.description}</p> : null}
              </div>
              <div className="exp-selected-actions">
                <Button size="sm" variant="secondary" onClick={() => openEdit(currentProject)}>
                  编辑
                </Button>
                {isDefaultProject(currentProject) ? null : (
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget(currentProject)}>
                    删除
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <div className="toolbar exp-toolbar">
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索实验名 / 创建人..." />
            </div>
            <Select
              variant="filter"
              aria-label="按状态筛选"
              value={status}
              options={[
                { value: "all", label: "全部状态" },
                { value: "running", label: "运行中" },
                { value: "success", label: "已完成" },
                { value: "failed", label: "失败" },
                { value: "cancelled", label: "已取消" },
              ]}
              onChange={(next) => { setStatus(next); setPage(1); }}
            />
            <Select
              variant="filter"
              aria-label="排序"
              value={sort}
              options={[
                { value: "updated_desc", label: "最近更新" },
                { value: "created_desc", label: "最近创建" },
                { value: "loss_asc", label: "Train Loss ↑" },
                { value: "loss_desc", label: "Train Loss ↓" },
              ]}
              onChange={setSort}
            />
          </div>
          <div className="card exp-list-card">
            <div className="card-body flush">
              <ListBody loading={clustersLoading || runsQuery.isLoading} loadingLabel="正在加载实验…" errorLabel="加载失败" emptyLabel="还没有实验" empty={false} error={runsQuery.isError}>
                <div className="table-wrap exp-table-wrap">
                  <table className="table exp-table">
                    <thead>
                      <tr>
                        <th className="th-check exp-col-check">
                          <input
                            type="checkbox"
                            aria-label="全选实验"
                            checked={runs.length > 0 && runs.every((r) => selected.includes(r.id))}
                            onChange={(e) => setSelected(e.target.checked ? runs.map((r) => r.id) : [])}
                          />
                        </th>
                        <th className="exp-col-run">实验名称</th>
                        <th className="exp-col-status">状态</th>
                        <th className="exp-col-loss">Loss</th>
                        <th className="exp-col-step">进度</th>
                        <th className="exp-col-tps">吞吐</th>
                        <th className="exp-col-job">关联任务</th>
                        <th className="exp-col-owner">创建人</th>
                        <th className="exp-col-time">更新时间</th>
                        <th className="exp-col-actions">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.length ? (
                        runs.map((run) => (
                          <tr key={run.id} className={selected.includes(run.id) ? "exp-row-selected" : undefined}>
                            <td className="td-check exp-col-check">
                              <input type="checkbox" aria-label={`选择 ${run.name}`} checked={selected.includes(run.id)} onChange={() => toggleSelect(run.id)} />
                            </td>
                            <td>
                              <div className="exp-name-cell">
                                <div
                                  className="exp-run-name link-cell"
                                  role="link"
                                  tabIndex={0}
                                  onClick={() => navigate(`/training/experiments/${run.id}`)}
                                  onKeyDown={(e) => e.key === "Enter" && navigate(`/training/experiments/${run.id}`)}
                                >
                                  {run.name}
                                </div>
                                <div className="exp-run-meta text-muted">{run.projectName}</div>
                              </div>
                            </td>
                            <td>{run.jobStatus ? <JobStatusBadge status={run.jobStatus} /> : "—"}</td>
                            <td className="mono">{dash(run.loss)}</td>
                            <td className="mono">{progressLabel(run)}</td>
                            <td className="mono">{dash(run.tokensPerSec)}</td>
                            <td>
                              {run.jobId ? (
                                <span className="exp-job-link link-cell" role="link" tabIndex={0} onClick={() => navigate(`/training/jobs/${run.jobId}`)}>
                                  {run.jobName || run.jobId}
                                </span>
                              ) : "—"}
                            </td>
                            <td>
                              <div className="exp-owner-name">{run.ownerNickname}</div>
                            </td>
                            <td className="mono text-muted exp-col-time">
                              <CreatedAtCell ms={run.updatedAt} />
                            </td>
                            <td>
                              <div className="exp-row-actions">
                                <button type="button" className="exp-row-action" onClick={() => openMove(run)}>移动</button>
                                <button type="button" className="exp-row-action danger" onClick={() => setRunDeleteTarget(run)}>删除</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10}>
                            <div className="empty-state exp-empty">
                              {clusterId ? (
                                <>
                                  <p>还没有实验</p>
                                  <p className="text-muted">提交训练任务后会自动出现在这里。已有任务会在打开本页时补建。</p>
                                  <div className="exp-empty-actions">
                                    <Button size="sm" onClick={() => navigate(jobCreateHref)}>新建训练任务</Button>
                                  </div>
                                </>
                              ) : (
                                "请先在运维中心接入工作集群"
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {runsQuery.isLoading ? null : <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
              </ListBody>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={formOpen}
        title={editing ? "编辑项目" : "新建项目"}
        onClose={() => setFormOpen(false)}
        onConfirm={() => saveMutation.mutate()}
        confirmText={editing ? "保存" : "创建项目"}
        confirmDisabled={saveMutation.isPending}
      >
        <p className="modal-lead">{editing && isDefaultProject(editing) ? "默认项目用于未指定项目的训练任务。名称不可改。" : "项目用于归类训练实验。"}</p>
        <Field id="proj-form-name" label="项目名称" requiredMark value={formName} readOnly={Boolean(editing && isDefaultProject(editing))} className={editing && isDefaultProject(editing) ? "is-readonly" : ""} onChange={(e) => setFormName(e.target.value)} placeholder="例如 slm-7b-pretrain" />
        <div className="form-group">
          <label htmlFor="proj-form-desc">描述</label>
          <textarea id="proj-form-desc" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} placeholder="可选，例如 7B 预训练主线" />
        </div>
        {formError ? <div className="login-error" role="alert">{formError}</div> : null}
      </Modal>
      <Modal
        open={Boolean(deleteTarget)}
        title={defaultBlocked ? "无法删除项目" : "确认删除项目"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={defaultBlocked ? undefined : () => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmText="确认删除"
        confirmVariant="danger"
        confirmDisabled={deleteMutation.isPending}
        confirmHidden={defaultBlocked}
        cancelText={defaultBlocked ? "知道了" : "取消"}
      >
        {defaultBlocked ? (
          <>
            <p className="modal-msg">默认项目不可删除，未指定项目的训练任务会自动关联到这里。</p>
            <p className="modal-hint is-warning">可编辑描述，或把实验移动到其它项目。</p>
          </>
        ) : (
          <>
            <p className="modal-msg">确定要删除项目 <strong>{deleteTarget ? projectLabel(deleteTarget) : ""}</strong> 吗？</p>
            <p className="modal-hint is-danger">其下实验会移到默认项目。此操作不可撤销。</p>
          </>
        )}
      </Modal>
      <Modal
        open={Boolean(moveTarget)}
        title="移动实验"
        onClose={() => setMoveTarget(null)}
        onConfirm={() => moveTarget && moveProjectId && moveMutation.mutate({ id: moveTarget.id, projectId: Number(moveProjectId) })}
        confirmText="移动"
        confirmDisabled={moveMutation.isPending || !moveProjectId || Number(moveProjectId) === moveTarget?.projectId}
      >
        <p className="modal-lead">把「{moveTarget?.name}」移动到另一个项目。</p>
        <div className="exp-move-list" role="listbox" aria-label="目标项目">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              id={p.id === Number(moveProjectId) ? "exp-move-project" : undefined}
              className={`exp-move-item ${String(p.id) === moveProjectId ? "is-selected" : ""}`}
              onClick={() => setMoveProjectId(String(p.id))}
            >
              <span className="exp-move-item-name">{projectLabel(p)}</span>
              <span className="exp-move-item-meta">{p.runCount} 个实验</span>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={Boolean(runDeleteTarget)}
        title="确认删除实验"
        onClose={() => setRunDeleteTarget(null)}
        onConfirm={() => runDeleteTarget && deleteRunMutation.mutate(runDeleteTarget.id)}
        confirmText="确认删除"
        confirmVariant="danger"
        confirmDisabled={deleteRunMutation.isPending}
      >
        <p className="modal-msg">确定要删除实验 <strong>{runDeleteTarget?.name}</strong> 吗？</p>
        <p className="modal-hint is-danger">删除后不再出现在实验列表。关联训练任务仍会保留。此操作不可撤销。</p>
      </Modal>
    </section>
  );
}

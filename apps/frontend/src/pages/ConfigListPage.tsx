import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listConfigs, listTrainingTeams, updateConfigStatus } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { Pagination } from "@/components/Pagination";
import { formatTime } from "@/lib/format";
import { frameworkLabel } from "@/lib/job";
import { toast } from "@/lib/toast";

export function ConfigListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [teamId, setTeamId] = useState("all");
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("all");
  const [framework, setFramework] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const teamsQuery = useQuery({ queryKey: ["training-teams"], queryFn: listTrainingTeams });
  const listQuery = useQuery({
    queryKey: ["training-configs", { keyword, teamId, scope, status, framework, page, pageSize }],
    queryFn: () =>
      listConfigs({
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        teamId: teamId === "all" ? undefined : Number(teamId),
        scope,
        status,
        framework,
      }),
  });
  const rows = listQuery.data?.list ?? [];
  const archive = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateConfigStatus(id, status),
    onSuccess: async () => {
      toast.success("已更新配置集状态");
      await queryClient.invalidateQueries({ queryKey: ["training-configs"] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "更新失败"),
  });

  return (
    <section className="page active" id="page-configs">
      <div className="page-header">
        <div>
          <h1>配置管理</h1>
          <p className="desc">管理训练超参 YAML / JSON，按版本挂载到任务容器 · 单个文件不超过 50 KB</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => navigate("/training/configs/new")}>+ 新建配置集</Button>
        </div>
      </div>
      <div className="toolbar cfg-toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input placeholder="搜索配置名称..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={teamId} onChange={(e) => { setTeamId(e.target.value); setPage(1); }}>
          <option value="all">全部团队</option>
          {(teamsQuery.data?.list ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="filter-select" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }}>
          <option value="all">全部范围</option>
          <option value="mine">我创建的</option>
          <option value="team">团队共享</option>
          <option value="private">仅自己可见</option>
          <option value="draft">有个人草稿</option>
        </select>
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">全部状态</option>
          <option value="active">使用中</option>
          <option value="archived">已归档</option>
        </select>
        <select className="filter-select" value={framework} onChange={(e) => { setFramework(e.target.value); setPage(1); }}>
          <option value="all">全部框架</option>
          <option value="megatron">Megatron</option>
          <option value="nemo">NeMo</option>
          <option value="accelerate">Accelerate</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div className="card">
        <div className="card-body flush">
          <ListBody loading={listQuery.isLoading} loadingLabel="正在加载配置集…" errorLabel="加载失败" emptyLabel="" empty={false} error={listQuery.isError}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>配置集</th>
                    <th>团队</th>
                    <th>框架</th>
                    <th>最新版本</th>
                    <th>文件数</th>
                    <th>更新时间</th>
                    <th>创建人</th>
                    <th className="th-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row) => (
                    <tr key={row.id} className={row.status === "archived" ? "cfg-row-archived" : ""}>
                      <td>
                        <div className="cfg-name-cell">
                          <span className="cfg-display-row">
                            <span className="cfg-display link-cell" onClick={() => navigate(`/training/configs/${row.id}`)} title="查看配置详情">{row.displayName}</span>
                            {row.hasDraft ? <span className="badge badge-warning" title="你有未发布的个人草稿，编辑新版本时会载入草稿而不是已发布版本">草稿</span> : null}
                          </span>
                        </div>
                      </td>
                      <td>{row.teamName}</td>
                      <td>{frameworkLabel(row.framework)}</td>
                      <td>
                        <div>{row.latestVersion ? `v${row.latestVersion}` : "—"}</div>
                        <div className="text-muted" style={{ fontSize: 11.5, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.latestMessage || ""}>{row.latestMessage || "—"}</div>
                      </td>
                      <td className="mono">{row.fileCount}</td>
                      <td className="mono text-muted">{formatTime(row.updatedAt)}</td>
                      <td>{row.ownerNickname}</td>
                      <td className="td-actions">
                        {row.status === "archived" ? (
                          <div className="job-actions">
                            <Button variant="secondary" size="sm" onClick={() => archive.mutate({ id: row.id, status: "active" })}>恢复</Button>
                          </div>
                        ) : (
                          <div className="job-actions job-actions-stack">
                            <div className="job-actions-row">
                              <Button variant="secondary" size="sm" onClick={() => navigate(`/training/configs/${row.id}/edit`)}>编辑新版本</Button>
                            </div>
                            <div className="job-actions-row">
                              {row.latestVersion > 0 ? (
                                <Button variant="secondary" size="sm" onClick={() => navigate(`/training/jobs/new?configId=${row.id}`)}>用于创建任务</Button>
                              ) : null}
                              <Button variant="danger" size="sm" onClick={() => archive.mutate({ id: row.id, status: "archived" })}>归档</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8}><div className="empty-state">还没有配置集。把 Megatron 的 configs/ 做成配置集，提交任务时默认只读挂到 /data/hpc/home/&lt;username&gt;/experiments/&lt;任务名称&gt;/configs/。</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={listQuery.data?.total ?? 0} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </ListBody>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getConfig, getConfigVersion, updateConfigStatus } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListLoading } from "@/components/ListLoading";
import { formatTime } from "@/lib/format";
import { configFileLang, frameworkLabel } from "@/lib/job";
import { toast } from "@/lib/toast";

export function ConfigDetailPage() {
  const { id } = useParams();
  const setId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"files" | "history">("files");
  const [ver, setVer] = useState(0);
  const [activePath, setActivePath] = useState("");
  const detailQuery = useQuery({ queryKey: ["training-config", setId], queryFn: () => getConfig(setId), enabled: setId > 0 });
  const item = detailQuery.data;
  const versionQuery = useQuery({
    queryKey: ["training-config-ver", setId, ver],
    queryFn: () => getConfigVersion(setId, ver),
    enabled: setId > 0 && ver > 0,
  });
  const restore = useMutation({
    mutationFn: () => updateConfigStatus(setId, "active"),
    onSuccess: async () => {
      toast.success("已恢复配置集");
      await queryClient.invalidateQueries({ queryKey: ["training-config", setId] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "恢复失败"),
  });
  const archive = useMutation({
    mutationFn: () => updateConfigStatus(setId, "archived"),
    onSuccess: async () => {
      toast.success("已归档配置集");
      await queryClient.invalidateQueries({ queryKey: ["training-config", setId] });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "归档失败"),
  });
  const files = ver ? versionQuery.data?.files ?? [] : item?.files ?? [];
  const active = files.find((f) => f.path === activePath) || files[0];

  if (detailQuery.isLoading) {
    return <div className="card" style={{ margin: 24 }}><ListLoading label="正在加载配置集…" /></div>;
  }
  if (!item) {
    return <section className="page active"><div className="empty-state">配置集不存在</div></section>;
  }

  return (
    <section className="page active" id="page-config-detail">
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div>
            <h2>
              {item.displayName}{" "}
              {item.status === "archived" ? <span className="badge badge-cancelled">已归档</span> : <span className="badge badge-healthy">使用中</span>}
              {item.hasDraft ? <span className="badge badge-warning">有个人草稿</span> : null}
            </h2>
          </div>
          <div className="cfg-hero-actions">
            {item.status === "archived" ? (
              <Button variant="secondary" size="sm" onClick={() => restore.mutate()}>恢复</Button>
            ) : (
              <>
                <Button size="sm" onClick={() => navigate(`/training/configs/${item.id}/edit`)}>编辑新版本</Button>
                {item.latestVersion > 0 ? <Button variant="secondary" size="sm" onClick={() => navigate(`/training/jobs/new?configId=${item.id}`)}>用于创建任务</Button> : null}
                <Button variant="danger" size="sm" onClick={() => archive.mutate()}>归档</Button>
              </>
            )}
          </div>
        </div>
        <div className="detail-meta">
          <div className="meta-item"><div className="label">团队</div><div className="value">{item.teamName}</div></div>
          <div className="meta-item"><div className="label">框架</div><div className="value">{frameworkLabel(item.framework)}</div></div>
          <div className="meta-item"><div className="label">最新版本</div><div className="value mono">{item.latestVersion ? `v${item.latestVersion}` : "—"}</div></div>
          <div className="meta-item"><div className="label">创建人</div><div className="value">{item.ownerNickname}</div></div>
          <div className="meta-item"><div className="label">更新时间</div><div className="value mono">{formatTime(item.updatedAt)}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="tabs">
          <div className={`tab ${tab === "files" ? "active" : ""}`} onClick={() => setTab("files")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            文件
          </div>
          <div className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            版本历史
          </div>
        </div>
        {tab === "files" ? (
          <div className="tab-panel active" id="panel-cfg-files" style={{ padding: 0 }}>
            <div className="cfg-file-workspace cfg-view-workspace">
              <div className="cfg-view-bar">
                <div className="cfg-view-bar-row">
                  <div className="cfg-view-ver">
                    <span className="cfg-view-label">正在查看</span>
                    <span className={`cfg-ver-chip ${!ver || ver === item.latestVersion ? "is-latest" : ""}`}>v{ver || item.latestVersion || "—"}</span>
                    {!ver || ver === item.latestVersion ? <span className="cfg-ver-flag">最新</span> : null}
                  </div>
                  <div className="cfg-view-stats">{files.length} 个文件</div>
                </div>
              </div>
              <aside className="cfg-file-tree">
                <div className="cfg-file-tree-head">
                  <div className="cfg-file-tree-title"><span>文件</span><span className="cfg-file-count">{files.length}</span></div>
                </div>
                <div className="cfg-file-tree-list">
                  {files.length ? files.map((f) => (
                    <button type="button" key={f.path} className={`cfg-file-item ${(active?.path || "") === f.path ? "is-active" : ""}`} onClick={() => setActivePath(f.path)}>
                      <span className="cfg-file-glyph" aria-hidden="true" />
                      <span className="cfg-file-path">{f.path}</span>
                    </button>
                  )) : <div className="cfg-file-empty">没有文件</div>}
                </div>
              </aside>
              <section className="cfg-file-editor">
                {active ? (
                  <>
                    <div className="cfg-file-editor-head">
                      <span className="cfg-file-path-label mono">{active.path}</span>
                      <span className="cfg-file-lang">{configFileLang(active.path)}</span>
                    </div>
                    <pre className="code-block is-hl" data-lang="yaml">{active.content}</pre>
                  </>
                ) : <div className="cfg-file-empty is-editor">选择左侧文件查看内容</div>}
              </section>
            </div>
          </div>
        ) : (
          <div className="tab-panel active">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>版本</th><th>说明</th><th>发布人</th><th>发布时间</th><th>文件数</th><th className="th-actions">操作</th></tr></thead>
                <tbody>
                  {(item.versions || []).map((v) => (
                    <tr key={v.version} className={(ver || item.latestVersion) === v.version ? "is-viewing" : ""}>
                      <td className="mono">v{v.version}{v.version === item.latestVersion ? ' ' : ""}{v.version === item.latestVersion ? <span className="badge badge-info">最新</span> : null}</td>
                      <td>{v.message}</td>
                      <td>{v.authorNickname}</td>
                      <td className="mono text-muted">{formatTime(v.createdAt)}</td>
                      <td className="mono">{v.fileCount}</td>
                      <td className="td-actions">
                        <Button variant="ghost" size="sm" onClick={() => { setVer(v.version); setTab("files"); }}>查看</Button>
                        {item.status !== "archived" ? (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/training/jobs/new?configId=${item.id}&configVersion=${v.version}`)}>用此版本创建任务</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createConfig, getConfig, listTrainingTeams, publishConfig, saveConfigDraft, type ConfigFile } from "@/api/training";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeEditor, codeLangFromPath } from "@/components/CodeEditor";
import { FieldError } from "@/components/Field";
import { ListLoading } from "@/components/ListLoading";
import { formatTime } from "@/lib/format";
import { configFileLang } from "@/lib/job";
import { toast } from "@/lib/toast";

const templates: Record<string, ConfigFile[]> = {
  megatron: [{ path: "pretrain.yaml", content: "seq_len: 8192\nmicro_batch_size: 2\n" }],
  nemo: [{ path: "config.yaml", content: "defaults:\n  - model: gpt\n" }],
  accelerate: [{ path: "default_config.yaml", content: "distributed_type: MULTI_GPU\nmixed_precision: bf16\n" }],
  custom: [{ path: "config.yaml", content: "" }],
};

export function ConfigEditPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const setId = Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"basic" | "files" | "publish">("basic");
  const [displayName, setDisplayName] = useState("");
  const [teamId, setTeamId] = useState(0);
  const [framework, setFramework] = useState("megatron");
  const [visibility, setVisibility] = useState("team");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ConfigFile[]>(templates.megatron);
  const [activePath, setActivePath] = useState(files[0]?.path || "");
  const [nameError, setNameError] = useState("");
  const [msgError, setMsgError] = useState("");

  const teamsQuery = useQuery({ queryKey: ["training-teams"], queryFn: listTrainingTeams });
  const detailQuery = useQuery({
    queryKey: ["training-config", setId],
    queryFn: () => getConfig(setId),
    enabled: !isNew && setId > 0,
  });

  useEffect(() => {
    const item = detailQuery.data;
    if (!item) return;
    setDisplayName(item.displayName);
    setTeamId(item.teamId);
    setFramework(item.framework);
    setVisibility(item.visibility);
    setDescription(item.description);
    const draftFiles = item.draft?.files?.length ? item.draft.files : item.files;
    if (draftFiles?.length) {
      setFiles(draftFiles);
      setActivePath(draftFiles[0].path);
    }
    if (item.draft?.message) setMessage(item.draft.message);
  }, [detailQuery.data]);

  const active = files.find((f) => f.path === activePath);

  const createMut = useMutation({
    mutationFn: () => createConfig({ displayName, teamId, framework, visibility, description, files, message }),
    onSuccess: (data) => {
      toast.success("草稿已保存");
      navigate(`/training/configs/${data.id}/edit`, { replace: true });
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "保存失败"),
  });
  const draftMut = useMutation({
    mutationFn: () => saveConfigDraft(setId, { displayName, framework, visibility, description, message, files }),
    onSuccess: () => toast.success("草稿已保存"),
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "保存失败"),
  });
  const pubMut = useMutation({
    mutationFn: () => publishConfig(setId, { displayName, framework, visibility, description, message, files, baseVersion: detailQuery.data?.latestVersion ?? 0 }),
    onSuccess: (data) => {
      toast.success(`已发布 v${data.version}`);
      navigate(`/training/configs/${setId}`);
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "发布失败"),
  });

  function ensureName() {
    if (!displayName.trim()) {
      setNameError("请填写显示名称");
      goTab("basic");
      return false;
    }
    setNameError("");
    return true;
  }

  if (!isNew && detailQuery.isLoading) {
    return <div className="card" style={{ margin: 24 }}><ListLoading label="正在加载配置集…" /></div>;
  }

  function goTab(next: "basic" | "files" | "publish") {
    setTab(next);
    document.getElementById(`cfg-edit-section-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="page active" id="page-config-edit">
      <div className="page-header">
        <div>
          <h1 className="cfg-edit-title">
            <span>{isNew ? "新建配置集" : `发布新版本 · ${displayName || "配置集"}`}</span>
            {detailQuery.data?.hasDraft ? <span className="badge badge-warning">个人草稿</span> : null}
          </h1>
          <p className="desc">{isNew ? "填写基本信息与文件，保存草稿或直接发布为 v1" : "在线编辑多文件 YAML，保存草稿或发布为不可变版本"}</p>
        </div>
      </div>
      {detailQuery.data?.hasDraft ? (
        <div className="demo-banner cfg-draft-banner" role="status">
          <span className="cfg-draft-banner-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          </span>
          <span className="cfg-draft-banner-copy">当前编辑的是个人草稿，不是已发布版本{detailQuery.data.draftUpdatedAt ? ` · ${formatTime(detailQuery.data.draftUpdatedAt)} 保存` : ""}</span>
        </div>
      ) : null}
      <div className="wizard-layout cfg-editor-layout">
        <div className="card job-create-form-card cfg-edit-form-card">
          <div className="tabs create-form-tabs" role="navigation" aria-label="配置表单章节">
            <button type="button" className={`tab ${tab === "basic" ? "active" : ""} ${displayName ? "is-done" : ""}`} onClick={() => goTab("basic")}>
              <span className="num">1</span>
              <span className="create-tab-copy"><span className="create-tab-title">基本信息</span><span className="create-tab-meta">{displayName || "名称 / 团队 / 可见性"}</span></span>
            </button>
            <button type="button" className={`tab ${tab === "files" ? "active" : ""} ${files.length ? "is-done" : ""}`} onClick={() => goTab("files")}>
              <span className="num">2</span>
              <span className="create-tab-copy"><span className="create-tab-title">文件</span><span className="create-tab-meta">{files.length ? `${files.length} 个文件` : "YAML / JSON"}</span></span>
            </button>
            <button type="button" className={`tab ${tab === "publish" ? "active" : ""}`} onClick={() => goTab("publish")}>
              <span className="num">3</span>
              <span className="create-tab-copy"><span className="create-tab-title">版本说明</span><span className="create-tab-meta">发布前填写说明</span></span>
            </button>
            {detailQuery.data?.hasDraft ? <span className="cfg-edit-draft-flag">个人草稿</span> : null}
          </div>
          <div id="cfg-edit-panels">
            <div className="tab-panel create-form-section" data-panel="basic" id="cfg-edit-section-basic">
              <div className="form-section-title"><span className="num">1</span> 基本信息</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>显示名称 <span className="req">*</span></label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="例如 SLM 7B Phase4 预训练" />
                  <FieldError>{nameError}</FieldError>
                </div>
                <div className="form-group">
                  <label>所属团队 <span className="req">*</span></label>
                  <select id="cfg-edit-team" value={teamId} onChange={(e) => setTeamId(Number(e.target.value))} disabled={!isNew}>
                    <option value={0}>请选择</option>
                    {(teamsQuery.data?.list ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>可见性</label>
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="team">团队共享</option>
                    <option value="private">仅自己可见</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>框架模板</label>
                  <select value={framework} onChange={(e) => { setFramework(e.target.value); if (isNew) { const next = templates[e.target.value] || templates.custom; setFiles(next); setActivePath(next[0]?.path || ""); } }}>
                    <option value="megatron">Megatron</option>
                    <option value="nemo">NeMo</option>
                    <option value="accelerate">Accelerate</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label>描述</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 64 }} />
                </div>
              </div>
            </div>
            <div className="tab-panel create-form-section" data-panel="files" id="cfg-edit-section-files">
              <div className="form-section-title"><span className="num">2</span> 文件</div>
              <div className="cfg-file-workspace">
                <aside className="cfg-file-tree">
                  <div className="cfg-file-tree-head">
                    <div className="cfg-file-tree-title"><span>文件</span> <span className="cfg-file-count">{files.length}</span></div>
                    <div className="cfg-file-tree-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                        const path = window.prompt("新文件相对路径", "extra.yaml");
                        if (!path) return;
                        const rel = path.trim().replace(/^\/+/, "");
                        if (files.some((f) => f.path === rel)) { toast.error("文件已存在"); return; }
                        setFiles((all) => [...all, { path: rel, content: "" }]);
                        setActivePath(rel);
                      }}>+ 文件</button>
                      <label className="btn btn-ghost btn-sm" style={{ margin: 0 }}>
                        上传
                        <input type="file" multiple hidden onChange={async (e) => {
                          const picked = [...(e.target.files || [])];
                          e.target.value = "";
                          for (const file of picked) {
                            const rel = file.name.replace(/^\/+/, "");
                            if (files.some((f) => f.path === rel)) { toast.error(`${rel} 已存在`); continue; }
                            const content = await file.text();
                            setFiles((all) => [...all, { path: rel, content }]);
                            setActivePath(rel);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                  <div className="cfg-file-tree-list">
                    {files.length ? files.map((f) => (
                      <button type="button" key={f.path} className={`cfg-file-item ${f.path === activePath ? "is-active" : ""}`} onClick={() => setActivePath(f.path)}>
                        <span className="cfg-file-glyph" aria-hidden="true" />
                        <span className="cfg-file-path" title={f.path}>{f.path}</span>
                      </button>
                    )) : <div className="cfg-file-empty">还没有文件<br /><span>点击上方新建或上传</span></div>}
                  </div>
                  <div className="cfg-file-tree-foot">每个配置文件不超过 50 KB</div>
                </aside>
                <section className="cfg-file-editor">
                  {active ? (
                    <>
                      <div className="cfg-file-editor-head">
                        <input className="cfg-file-path-input mono" value={active.path} onChange={(e) => {
                          const next = e.target.value;
                          setFiles((all) => all.map((f) => (f.path === active.path ? { ...f, path: next } : f)));
                          setActivePath(next);
                        }} />
                        <span className="cfg-file-lang">{configFileLang(active.path)}</span>
                        <Button variant="danger" size="sm" onClick={() => {
                          const next = files.filter((f) => f.path !== active.path);
                          setFiles(next);
                          setActivePath(next[0]?.path || "");
                        }}>删除</Button>
                      </div>
                      <div className="code-editor cfg-file-code">
                        <CodeEditor
                          key={active.path}
                          language={codeLangFromPath(active.path)}
                          value={active.content}
                          onChange={(content) => setFiles((all) => all.map((f) => (f.path === active.path ? { ...f, content } : f)))}
                          lineNumbers
                          wrap={false}
                          tabIndent
                          aria-label={`${active.path} 文件内容`}
                        />
                      </div>
                    </>
                  ) : <div className="cfg-file-empty is-editor">选择左侧文件，或新建一个文件开始编辑</div>}
                </section>
              </div>
            </div>
            <div className="tab-panel create-form-section" data-panel="publish" id="cfg-edit-section-publish">
              <div className="form-section-title"><span className="num">3</span> 版本说明</div>
              <div className="form-grid">
                <div className="form-group full">
                  <label>版本说明（发布必填）</label>
                  <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="说明本版相对上一版改了什么，例如：学习率降至 1.5e-4，序列长度改为 8192" />
                  <FieldError>{msgError}</FieldError>
                </div>
                <div className="form-group">
                  <div className="field-label-row">
                    <label>基于版本</label>
                    <span className="field-lock-hint">只读</span>
                  </div>
                  <input className="mono" readOnly value={detailQuery.data?.latestVersion ? `v${detailQuery.data.latestVersion}` : "—（首版）"} />
                </div>
              </div>
            </div>
          </div>
          <div className="create-form-footer cfg-edit-footer">
            <div className="flex gap-8">
              <Button variant="secondary" onClick={() => navigate(isNew ? "/training/configs" : `/training/configs/${setId}`)}>取消</Button>
              <Button variant="secondary" onClick={() => {
                if (!ensureName() || !teamId) { toast.error("请填写显示名称并选择团队"); return; }
                if (isNew) createMut.mutate();
                else draftMut.mutate();
              }}>保存草稿</Button>
              <Button onClick={() => {
                if (!ensureName()) return;
                if (!message.trim()) { setMsgError("发布时必须填写版本说明"); goTab("publish"); return; }
                setMsgError("");
                if (isNew) {
                  createMut.mutate(undefined, {
                    onSuccess: async (data) => {
                      await publishConfig(data.id, { displayName, framework, visibility, description, message, files, baseVersion: 0 });
                      toast.success("已发布 v1");
                      navigate(`/training/configs/${data.id}`);
                    },
                  });
                  return;
                }
                pubMut.mutate();
              }}>发布为 v{(detailQuery.data?.latestVersion ?? 0) + 1}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

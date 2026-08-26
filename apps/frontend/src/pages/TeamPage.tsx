import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addTeamMember, createTeam, getTeam, listTeams, removeTeamMember, updateTeam, type TeamListItem } from "@/api/team";
import { listUsers, type PlatformUser } from "@/api/user";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { formatTime } from "@/lib/format";
import { toast } from "@/lib/toast";

export function TeamPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamListItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [owner, setOwner] = useState<PlatformUser | null>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [formError, setFormError] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");

  const listQuery = useQuery({
    queryKey: ["teams", { keyword, page, pageSize }],
    queryFn: () => listTeams({ pageNum: page, pageSize, keyword: keyword.trim() || undefined }),
  });
  const teams = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;

  useEffect(() => {
    if (!teams.length) {
      setCurrentId(null);
      return;
    }
    if (!currentId || !teams.some((item) => item.id === currentId)) {
      setCurrentId(teams[0].id);
    }
  }, [teams, currentId]);

  const detailQuery = useQuery({
    queryKey: ["team", currentId],
    queryFn: () => getTeam(currentId!),
    enabled: Boolean(currentId),
  });
  const detail = detailQuery.data;

  const ownerSearch = useQuery({
    queryKey: ["users", "owner-picker", ownerQuery],
    queryFn: () => listUsers({ pageNum: 1, pageSize: 20, keyword: ownerQuery.trim() || undefined, enabled: true }),
    enabled: formOpen && !owner,
  });
  const memberSearch = useQuery({
    queryKey: ["users", "member-picker", memberQuery, currentId],
    queryFn: () => listUsers({ pageNum: 1, pageSize: 20, keyword: memberQuery.trim() || undefined, enabled: true }),
    enabled: memberOpen,
  });

  function invalidate() {
    return Promise.all([queryClient.invalidateQueries({ queryKey: ["teams"] }), queryClient.invalidateQueries({ queryKey: ["team"] }), queryClient.invalidateQueries({ queryKey: ["users"] })]);
  }

  function showError(error: unknown) {
    const message = error instanceof ApiError ? error.message : "操作失败";
    setFormError(message);
    toast.error(message);
  }

  const createMutation = useMutation({
    mutationFn: () => createTeam({ name: formName.trim(), description: formDesc.trim(), ownerUserId: owner!.id }),
    onSuccess: async (data) => {
      toast.success(`团队已创建: ${formName.trim()}`);
      setFormOpen(false);
      setCurrentId(data.id);
      await invalidate();
    },
    onError: showError,
  });
  const updateMutation = useMutation({
    mutationFn: () => updateTeam(editing!.id, { name: formName.trim(), description: formDesc.trim(), ownerUserId: owner!.id }),
    onSuccess: async () => {
      toast.success(`团队已更新: ${formName.trim()}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => addTeamMember(currentId!, userId),
    onSuccess: async (_, userId) => {
      const user = memberSearch.data?.list.find((item) => item.id === userId);
      toast.success(`已添加成员 ${user?.nickname || ""}`);
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "添加失败"),
  });
  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeTeamMember(currentId!, userId),
    onSuccess: async (_, userId) => {
      const member = detail?.members.find((item) => item.id === userId);
      toast.success(`已移除成员 ${member?.nickname || ""}`);
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "移除失败"),
  });

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setOwner(null);
    setOwnerQuery("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit() {
    if (!detail) {
      return;
    }
    setEditing(detail);
    setFormName(detail.name);
    setFormDesc(detail.description);
    setOwner({
      id: detail.owner.id,
      username: detail.owner.username,
      nickname: detail.owner.nickname,
      email: "",
      department: "",
      title: "",
      roleCode: "",
      roleName: "",
      teams: [],
      enabled: true,
      lastLoginAt: 0,
      createdAt: 0,
    });
    setOwnerQuery("");
    setFormError("");
    setFormOpen(true);
  }

  function submitForm() {
    setFormError("");
    if (!formName.trim()) {
      setFormError("请填写团队名称");
      return;
    }
    if (!owner) {
      setFormError("请从用户列表中选择负责人");
      return;
    }
    if (editing) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  }

  const memberIds = new Set(detail?.members.map((item) => item.id) ?? []);
  const memberCandidates = (memberSearch.data?.list ?? []).filter((item) => !memberIds.has(item.id));

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>团队管理</h1>
          <p className="desc">平台「团队」是虚拟概念，不同于公司组织架构中的团队 · 主要用于资源额度划分与权限管理 · 成员可多对多加入</p>
        </div>
        <div className="page-actions">
          <Button onClick={openCreate}>+ 新建团队</Button>
        </div>
      </div>
      <div className="grid-2-1" id="team-mgmt-layout">
        <div className="card">
          <div className="card-header">
            <h3>团队列表</h3>
            <div className="search-box" style={{ maxWidth: 220 }}>
              <span className="search-icon">⌕</span>
              <input
                placeholder="搜索团队..."
                value={keyword}
                onChange={(event) => {
                  setPage(1);
                  setKeyword(event.target.value);
                }}
              />
            </div>
          </div>
          <div className="card-body flush" id="team-mgmt-list">
            {listQuery.isError ? (
              <div className="empty-state">团队列表加载失败</div>
            ) : teams.length === 0 ? (
              <div className="empty-state">暂无团队</div>
            ) : (
              <>
                <div className="rp-list">
                  {teams.map((item) => (
                    <div key={item.id} className={item.id === currentId ? "rp-list-item active" : "rp-list-item"} onClick={() => setCurrentId(item.id)}>
                      <div className="rp-list-title">{item.name}</div>
                      <div className="rp-list-meta">
                        <span>{item.memberCount} 成员</span>
                        <span className="text-muted">{item.owner.nickname}</span>
                      </div>
                      <div className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </>
            )}
          </div>
        </div>
        <div className="card" id="team-mgmt-detail">
          <div className="card-header">
            <h3>团队详情</h3>
          </div>
          <div className="card-body">
            {!detail ? (
              <div className="empty-state">请选择左侧团队</div>
            ) : (
              <>
                <div className="rp-detail-head">
                  <div>
                    <h3 style={{ fontSize: 16, color: "var(--text-0)", margin: 0 }}>{detail.name}</h3>
                    <p className="text-muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                      {detail.description || "—"}
                    </p>
                  </div>
                  <Button variant="secondary" className="rp-detail-action" onClick={openEdit}>
                    编辑
                  </Button>
                </div>
                <div className="kv-list mt-16">
                  <div className="kv-row">
                    <span className="k">负责人</span>
                    <span className="v">{detail.owner.nickname}</span>
                  </div>
                  <div className="kv-row">
                    <span className="k">创建时间</span>
                    <span className="v mono">{detail.createdAt ? formatTime(detail.createdAt) : "—"}</span>
                  </div>
                </div>
                <div className="form-section-title mt-16" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>成员（{detail.members.length}）</span>
                  <Button
                    variant="secondary"
                    className="rp-detail-action"
                    onClick={() => {
                      setMemberQuery("");
                      setMemberOpen(true);
                    }}
                  >
                    添加成员
                  </Button>
                </div>
                <div className="rp-member-chips">
                  {detail.members.length ? (
                    detail.members.map((member) => (
                      <span key={member.id} className="rp-chip">
                        {member.nickname}
                        <button type="button" className="rp-chip-x" title="移除" onClick={() => removeMemberMutation.mutate(member.id)}>
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">暂无成员</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={formOpen} title={editing ? "编辑团队" : "新建团队"} modalClassName="modal-team-create" confirmText={editing ? "保存" : "创建团队"} onClose={() => setFormOpen(false)} onConfirm={submitForm}>
        <p className="modal-lead text-muted">
          {editing ? "可修改团队名称、描述与负责人。成员请在详情中管理。" : "创建后可在详情中添加成员。负责人和成员须从平台可用用户中选择。"}
        </p>
        <div className="form-group">
          <label htmlFor="team-form-name">
            团队名称 <span className="req">*</span>
          </label>
          <input id="team-form-name" value={formName} placeholder="例如 SLM预训练" onChange={(event) => setFormName(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="team-form-desc">描述</label>
          <textarea id="team-form-desc" rows={2} value={formDesc} placeholder="团队目标与资源范围" style={{ minHeight: 72, width: "100%", resize: "vertical" }} onChange={(event) => setFormDesc(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="team-form-owner-search">
            负责人 <span className="req">*</span>
          </label>
          <div className="user-picker">
            <div className="user-picker-control">
              <input
                id="team-form-owner-search"
                value={owner ? `${owner.nickname}（${owner.username}）` : ownerQuery}
                readOnly={Boolean(owner)}
                className={owner ? "is-locked" : undefined}
                placeholder="搜索姓名 / 账号 / 邮箱..."
                onChange={(event) => setOwnerQuery(event.target.value)}
              />
              {owner ? (
                <button type="button" className="user-picker-clear" title="清除" onClick={() => setOwner(null)}>
                  ✕
                </button>
              ) : null}
            </div>
            {owner ? (
              <div className="user-picker-selected">
                <span className="user-picker-chip">
                  <span className="user-picker-chip-avatar">{owner.nickname.slice(0, 1)}</span>
                  <span className="user-picker-chip-meta">
                    <strong>{owner.nickname}</strong>
                    <span className="mono text-muted">{owner.username}</span>
                  </span>
                </span>
              </div>
            ) : (
              <div className="user-picker-dropdown">
                {(ownerSearch.data?.list ?? []).length === 0 ? (
                  <div className="user-picker-empty">无匹配的启用用户</div>
                ) : (
                  (ownerSearch.data?.list ?? []).map((item) => (
                    <button key={item.id} type="button" className="user-picker-item" onClick={() => setOwner(item)}>
                      <span className="user-picker-item-avatar">{item.nickname.slice(0, 1)}</span>
                      <span className="user-picker-item-body">
                        <span className="user-picker-item-line">
                          <strong>{item.nickname}</strong>
                          <span className="mono text-muted">{item.username}</span>
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        {formError ? (
          <div className="login-error" role="alert">
            {formError}
          </div>
        ) : null}
      </Modal>

      <Modal open={memberOpen} title="添加成员" maxWidth={480} cancelText="关闭" confirmText="关闭" onClose={() => setMemberOpen(false)} onConfirm={() => setMemberOpen(false)}>
        <div className="form-group">
          <label htmlFor="team-member-search">选择平台用户</label>
          <input id="team-member-search" value={memberQuery} placeholder="搜索姓名 / 账号..." onChange={(event) => setMemberQuery(event.target.value)} />
        </div>
        <div className="rp-member-results">
          {memberCandidates.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              无匹配用户或均已加入
            </div>
          ) : (
            memberCandidates.map((item) => (
              <div key={item.id} className="rp-member-row">
                <div>
                  <strong>{item.nickname}</strong>
                  <span className="mono text-muted" style={{ fontSize: 11.5, marginLeft: 6 }}>
                    {item.username}
                  </span>
                  <div className="text-muted" style={{ fontSize: 11.5 }}>
                    {item.department}
                  </div>
                </div>
                <Button size="sm" onClick={() => addMemberMutation.mutate(item.id)}>
                  添加
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addTeamMember, createTeam, getTeam, listTeams, removeTeamMember, updateTeam, type TeamListItem } from "@/api/team";
import { listUsers } from "@/api/user";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody, ListLoading } from "@/components/ListLoading";
import { FieldError } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { formatTime } from "@/lib/format";
import { errText, groupClass, invalidProps, LINE_MAX, useZodForm, zLine, zTextOpt } from "@/lib/form";
import { toast } from "@/lib/toast";

const teamSchema = z
  .object({
    name: zLine("请填写团队名称"),
    description: zTextOpt(),
    owner: z
      .object({
        id: z.number(),
        username: z.string(),
        nickname: z.string(),
      })
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.owner) {
      ctx.addIssue({ code: "custom", path: ["owner"], message: "请从用户列表中选择负责人" });
    }
  });

type TeamForm = z.infer<typeof teamSchema>;

const emptyTeamForm: TeamForm = { name: "", description: "", owner: null };

export function TeamPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamListItem | null>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [formError, setFormError] = useState("");
  const form = useZodForm(teamSchema, { defaultValues: emptyTeamForm });
  const owner = form.watch("owner");
  const nameError = errText(form.formState.errors, "name");
  const descError = errText(form.formState.errors, "description");
  const ownerError = errText(form.formState.errors, "owner");
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
    mutationFn: (input: TeamForm) => createTeam({ name: input.name.trim(), description: input.description.trim(), ownerUserId: input.owner!.id }),
    onSuccess: async (data, input) => {
      toast.success(`团队已创建: ${input.name.trim()}`);
      setFormOpen(false);
      setCurrentId(data.id);
      await invalidate();
    },
    onError: showError,
  });
  const updateMutation = useMutation({
    mutationFn: (input: TeamForm) => updateTeam(editing!.id, { name: input.name.trim(), description: input.description.trim(), ownerUserId: input.owner!.id }),
    onSuccess: async (_, input) => {
      toast.success(`团队已更新: ${input.name.trim()}`);
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
    form.reset(emptyTeamForm);
    setOwnerQuery("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit() {
    if (!detail) {
      return;
    }
    setEditing(detail);
    form.reset({
      name: detail.name,
      description: detail.description,
      owner: {
        id: detail.owner.id,
        username: detail.owner.username,
        nickname: detail.owner.nickname,
      },
    });
    setOwnerQuery("");
    setFormError("");
    setFormOpen(true);
  }

  const submitForm = form.handleSubmit((input) => {
    setFormError("");
    if (editing) {
      updateMutation.mutate(input);
      return;
    }
    createMutation.mutate(input);
  });

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
            <ListBody
              loading={listQuery.isLoading}
              error={listQuery.isError}
              empty={teams.length === 0}
              loadingLabel="正在加载团队…"
              errorLabel="团队列表加载失败"
              emptyLabel="暂无团队"
            >
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
            </ListBody>
          </div>
        </div>
        <div className="card" id="team-mgmt-detail">
          <div className="card-header">
            <h3>团队详情</h3>
          </div>
          <div className="card-body">
            {listQuery.isLoading || (currentId && detailQuery.isLoading) ? (
              <ListLoading label="正在加载团队详情…" />
            ) : !detail ? (
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
                <div className="form-section-title mt-16">关联队列</div>
                {(detail.queues ?? []).length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 12.5 }}>
                    尚未关联资源队列。队列绑定请在「队列管理」中维护。
                  </p>
                ) : (
                  <div className="rp-member-chips">
                    {detail.queues.map((q) => (
                      <span key={q.id} className="rp-chip" title={q.name}>
                        {q.displayName}
                        <span className="text-muted" style={{ marginLeft: 6, fontSize: 11 }}>
                          {q.enabled ? "启用" : "禁用"}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={formOpen} title={editing ? "编辑团队" : "新建团队"} modalClassName="modal-team-create" confirmText={editing ? "保存" : "创建团队"} onClose={() => setFormOpen(false)} onConfirm={submitForm}>
        <p className="modal-lead text-muted">
          {editing ? "可修改团队名称、描述与负责人。成员请在详情中管理。" : "创建后可在详情中添加成员。负责人和成员须从平台可用用户中选择。"}
        </p>
        <div className={groupClass(nameError)}>
          <label htmlFor="team-form-name">
            团队名称 <span className="req">*</span>
          </label>
          <input
            id="team-form-name"
            placeholder="例如 SLM预训练"
            maxLength={LINE_MAX}
            {...form.register("name")}
            {...invalidProps("team-form-name", nameError)}
          />
          <FieldError id="team-form-name-error">{nameError}</FieldError>
        </div>
        <div className={groupClass(descError)}>
          <label htmlFor="team-form-desc">描述</label>
          <textarea id="team-form-desc" rows={2} placeholder="团队目标与资源范围" style={{ minHeight: 72, width: "100%", resize: "vertical" }} {...form.register("description")} {...invalidProps("team-form-desc", descError)} />
          <FieldError id="team-form-desc-error">{descError}</FieldError>
        </div>
        <div className={groupClass(ownerError)}>
          <label htmlFor="team-form-owner-search">
            负责人 <span className="req">*</span>
          </label>
          <div className="user-picker">
            <div className="user-picker-control">
              <Controller
                name="owner"
                control={form.control}
                render={({ field }) => (
                  <>
                    <input
                      id="team-form-owner-search"
                      ref={field.ref}
                      value={field.value ? `${field.value.nickname}（${field.value.username}）` : ownerQuery}
                      readOnly={Boolean(field.value)}
                      className={field.value ? "is-locked" : undefined}
                      placeholder="搜索姓名 / 账号 / 邮箱..."
                      {...invalidProps("team-form-owner-search", ownerError)}
                      onChange={(event) => {
                        setOwnerQuery(event.target.value);
                        if (ownerError) {
                          form.clearErrors("owner");
                        }
                      }}
                    />
                    {field.value ? (
                      <button
                        type="button"
                        className="user-picker-clear"
                        title="清除"
                        onClick={() => {
                          field.onChange(null);
                          setOwnerQuery("");
                        }}
                      >
                        ✕
                      </button>
                    ) : null}
                  </>
                )}
              />
            </div>
            <FieldError id="team-form-owner-error">{ownerError}</FieldError>
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
                    <button
                      key={item.id}
                      type="button"
                      className="user-picker-item"
                      onClick={() => {
                        form.setValue("owner", { id: item.id, username: item.username, nickname: item.nickname }, { shouldValidate: true, shouldDirty: true });
                        setOwnerQuery("");
                      }}
                    >
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

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { createJob, getJob, listConfigs, listMyQueues, listRunUsers, listTrainingTeams, type MyQueue, type RunUser } from "@/api/training";
import { readSession } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { FieldError, FieldHelp } from "@/components/Field";
import { errText, groupClass, invalidProps, K8S_QNAME_MAX, useZodForm, zRequired, zVolcanoJobName } from "@/lib/form";
import { initials } from "@/lib/format";
import { quotaBarClass } from "@/lib/resources";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

const schema = z.object({
  name: zVolcanoJobName(),
  workdir: zRequired("请填写工作路径"),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  teamId: z.coerce.number().min(1, "请选择所属团队"),
  queueId: z.coerce.number().min(1, "请选择资源队列"),
  nodes: z.coerce.number().min(1, "请填写有效的节点数"),
  gpusPerNode: z.coerce.number().min(1, "请填写有效的每节点 GPU 数").max(8, "每节点 GPU 数不能超过 8"),
  cpuPerNode: z.coerce.number().min(1, "请填写有效的每节点 CPU 核数"),
  memGiPerNode: z.coerce.number().min(1, "请填写有效的每节点内存"),
  image: z.string().trim().min(1, "请填写容器镜像地址").refine((v) => v.includes("/") && !v.startsWith("/") && !/\s/.test(v), "请填写完整镜像地址，例如 harbor.msxf.com/ai/megatron:24.07"),
  command: zRequired("请填写启动命令"),
  envText: z.string(),
  runUserId: z.number().optional(),
});

type Form = z.infer<typeof schema>;
const tabs = [
  { id: "basic", title: "基本信息" },
  { id: "resources", title: "资源规格" },
  { id: "launch", title: "镜像与启动" },
  { id: "configs", title: "配置挂载" },
] as const;

const priorityCards = [
  { id: "P0", label: "最高", desc: "紧急 / 线上关键" },
  { id: "P1", label: "高", desc: "重要训练" },
  { id: "P2", label: "中", desc: "常规任务" },
  { id: "P3", label: "低", desc: "调试 / 可后置" },
] as const;

function parseEnv(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("=");
      if (i <= 0) return null;
      return { key: line.slice(0, i).trim(), value: line.slice(i + 1) };
    })
    .filter((x): x is { key: string; value: string } => Boolean(x));
}

const WORKDIR_PLACEHOLDER = "/data/hpc/home/<运行用户>";

function defaultWorkdir(username: string) {
  const user = username.trim();
  return user ? `/data/hpc/home/${user}` : "";
}

function rerunJobName(name: string) {
  const suffix = "-rerun";
  if (name.endsWith(suffix)) return name;
  if (name.length + suffix.length <= K8S_QNAME_MAX) return `${name}${suffix}`;
  const base = name.slice(0, K8S_QNAME_MAX - suffix.length).replace(/-+$/g, "");
  return `${base}${suffix}`;
}

export function JobCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rerunId = Number(params.get("rerun") || 0);
  const presetQueue = Number(params.get("queueId") || 0);
  const presetConfig = Number(params.get("configId") || 0);
  const presetConfigVer = Number(params.get("configVersion") || 0);
  const { clusterId } = useWorkingCluster("training");
  const session = useQuery({ queryKey: ["session"], queryFn: readSession });
  const user = session.data?.user;
  const isAdmin = Boolean(user?.isAdmin);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("basic");
  const [runQuery, setRunQuery] = useState("");
  const [runUser, setRunUser] = useState<RunUser | null>(null);
  const [runPickerOpen, setRunPickerOpen] = useState(false);
  const [mounts, setMounts] = useState<{ setId: number; version: number; mountPath: string }[]>([]);
  const runSearchRef = useRef<HTMLInputElement>(null);
  const workdirDefaultRef = useRef("");
  const rerunFilledRef = useRef(0);

  const methods = useZodForm(schema, {
    defaultValues: {
      name: "",
      workdir: "",
      priority: "P2",
      teamId: 0,
      queueId: presetQueue,
      nodes: 1,
      gpusPerNode: 1,
      cpuPerNode: 16,
      memGiPerNode: 128,
      image: "",
      command: "",
      envText: "",
    },
  });
  const form = methods.watch();
  const teamsQuery = useQuery({ queryKey: ["training-teams"], queryFn: listTrainingTeams });
  const queuesQuery = useQuery({
    queryKey: ["training-my-queues", clusterId],
    queryFn: () => listMyQueues(clusterId!),
    enabled: Boolean(clusterId),
  });
  const rerunQuery = useQuery({
    queryKey: ["training-job", rerunId],
    queryFn: () => getJob(rerunId),
    enabled: rerunId > 0,
  });
  const runUsersQuery = useQuery({
    queryKey: ["run-users", runQuery],
    queryFn: () => listRunUsers({ keyword: runQuery, pageNum: 1, pageSize: 30 }),
    enabled: isAdmin && !runUser && runPickerOpen,
  });
  const configsQuery = useQuery({
    queryKey: ["training-configs", "mount", form.teamId],
    queryFn: () => listConfigs({ pageNum: 1, pageSize: 50, teamId: form.teamId || undefined, status: "active" }),
    enabled: form.teamId > 0 || presetConfig > 0,
  });

  useEffect(() => {
    rerunFilledRef.current = 0;
    if (rerunId > 0) return;
    setRunUser(null);
    setRunQuery("");
    setRunPickerOpen(false);
  }, [rerunId]);

  useEffect(() => {
    if (!user?.username || methods.getValues("workdir") || isAdmin) return;
    const next = defaultWorkdir(user.username);
    methods.setValue("workdir", next);
    workdirDefaultRef.current = next;
  }, [user?.username, isAdmin, methods]);

  useEffect(() => {
    const job = rerunQuery.data;
    if (!rerunId || !job || !session.isFetched) return;
    if (!teamsQuery.isFetched) return;
    if (clusterId && !queuesQuery.isFetched) return;
    if (rerunFilledRef.current === job.id) return;
    rerunFilledRef.current = job.id;
    const workdir = job.workdir || defaultWorkdir(job.ownerUsername);
    methods.reset({
      name: rerunJobName(job.name),
      workdir,
      priority: (job.priority as Form["priority"]) || "P2",
      teamId: job.teamId,
      queueId: job.queueId,
      nodes: job.nodes,
      gpusPerNode: job.gpusPerNode,
      cpuPerNode: job.cpuPerNode,
      memGiPerNode: job.memGiPerNode,
      image: job.image,
      command: job.command,
      envText: (job.env || []).map((e) => `${e.key}=${e.value}`).join("\n"),
    });
    setMounts((job.mounts || []).map((m) => ({ setId: m.setId, version: m.version, mountPath: m.mountPath })));
    workdirDefaultRef.current = workdir;
    if (!isAdmin || !job.ownerUsername) return;
    void listRunUsers({ keyword: job.ownerUsername, pageNum: 1, pageSize: 20 }).then((res) => {
      if (rerunFilledRef.current !== job.id) return;
      const hit = (res.list ?? []).find((u) => u.username === job.ownerUsername);
      if (!hit) return;
      setRunUser(hit);
      setRunQuery("");
      setRunPickerOpen(false);
    });
  }, [rerunQuery.data, session.isFetched, teamsQuery.isFetched, queuesQuery.isFetched, clusterId, isAdmin, methods]);

  useEffect(() => {
    if (!presetConfig || mounts.length) return;
    const cfg = (configsQuery.data?.list ?? []).find((c) => c.id === presetConfig && c.latestVersion > 0);
    if (!cfg) return;
    const username = runUser?.username || user?.username || "user";
    setMounts([
      {
        setId: cfg.id,
        version: presetConfigVer || cfg.latestVersion,
        mountPath: `/data/hpc/home/${username}/experiments/${methods.getValues("name") || "job"}/configs`,
      },
    ]);
  }, [presetConfig, configsQuery.data, mounts.length, runUser?.username, user?.username, methods]);

  const queues = (queuesQuery.data?.list ?? []).filter((q) => {
    if (form.teamId && q.teams.every((t) => t.id !== form.teamId)) return false;
    return true;
  });
  const selectedQueue: MyQueue | undefined = queues.find((q) => q.id === Number(form.queueId));

  const save = useMutation({
    mutationFn: () =>
      createJob({
        clusterId: clusterId!,
        name: form.name,
        workdir: form.workdir,
        priority: form.priority,
        teamId: Number(form.teamId),
        queueId: Number(form.queueId),
        nodes: Number(form.nodes),
        gpusPerNode: Number(form.gpusPerNode),
        cpuPerNode: Number(form.cpuPerNode),
        memGiPerNode: Number(form.memGiPerNode),
        image: form.image,
        command: form.command,
        env: parseEnv(form.envText),
        mounts: mounts.filter((m) => m.setId && m.version),
        runUserId: isAdmin ? runUser?.id : undefined,
        rerunFromId: rerunId || undefined,
      }),
    onSuccess: (data) => {
      toast.success(rerunId ? "重跑任务已提交" : "任务已提交");
      navigate(`/training/jobs/${data.id}`);
    },
    onError: (error: unknown) => toast.error(error instanceof ApiError ? error.message : "提交失败"),
  });

  function applyRunUser(next: RunUser | null) {
    const current = methods.getValues("workdir").trim();
    const prevDefault = workdirDefaultRef.current;
    setRunUser(next);
    setRunQuery("");
    setRunPickerOpen(false);
    const nextDefault = next ? defaultWorkdir(next.username) : isAdmin ? "" : defaultWorkdir(user?.username || "");
    if (!current || current === prevDefault) {
      methods.setValue("workdir", nextDefault);
    }
    workdirDefaultRef.current = nextDefault;
  }

  function onSubmit() {
    if (isAdmin && !runUser) {
      setTab("basic");
      toast.error("请检索并指定运行用户。本地 admin 不在 LDAP 中，不能作为运行身份。");
      runSearchRef.current?.focus();
      return;
    }
    methods.handleSubmit(() => save.mutate(), (errors) => {
      const next = errors.name || errors.workdir ? "basic" : errors.teamId || errors.queueId || errors.nodes || errors.gpusPerNode || errors.cpuPerNode || errors.memGiPerNode ? "resources" : "launch";
      setTab(next);
      document.getElementById(`create-section-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    })();
  }

  const nameError = errText(methods.formState.errors, "name");
  const workdirError = errText(methods.formState.errors, "workdir");
  const teamError = errText(methods.formState.errors, "teamId");
  const queueError = errText(methods.formState.errors, "queueId");
  const imageError = errText(methods.formState.errors, "image");
  const commandError = errText(methods.formState.errors, "command");
  const gpuFree = selectedQueue ? Math.max(0, selectedQueue.gpuQuota - selectedQueue.gpuUsed) : 0;
  const cpuFree = selectedQueue ? Math.max(0, selectedQueue.cpuQuota - selectedQueue.cpuUsed) : 0;
  const memFree = selectedQueue ? Math.max(0, selectedQueue.memQuotaGi - selectedQueue.memUsedGi) : 0;
  const gpuPct = selectedQueue?.gpuQuota ? Math.min(100, Math.round((selectedQueue.gpuUsed / selectedQueue.gpuQuota) * 100)) : 0;
  const cpuPct = selectedQueue?.cpuQuota ? Math.min(100, Math.round((selectedQueue.cpuUsed / selectedQueue.cpuQuota) * 100)) : 0;
  const memPct = selectedQueue?.memQuotaGi ? Math.min(100, Math.round((selectedQueue.memUsedGi / selectedQueue.memQuotaGi) * 100)) : 0;
  const ibOn = Boolean(selectedQueue?.features.includes("ib"));
  const mountCount = mounts.filter((m) => m.setId).length;
  const basicDone = Boolean(form.name && form.workdir && (!isAdmin || runUser));
  const resDone = Boolean(form.teamId && form.queueId && form.nodes >= 1 && form.gpusPerNode >= 1);
  const launchDone = Boolean(form.image && form.command);
  const tabMeta = {
    basic: form.name || (isAdmin ? "名称 / 运行用户 / 工作路径" : "名称 / 工作路径"),
    resources: resDone ? `${form.nodes} 节点 · ${form.gpusPerNode} GPU · ${form.cpuPerNode} 核/节点` : "团队 / 队列 / 规格",
    launch: launchDone ? "已填写镜像与启动命令" : "镜像 / 命令 / 环境",
    configs: mountCount ? `${mountCount} 个配置集` : "可选",
  };
  const tabDone = { basic: basicDone, resources: resDone, launch: launchDone, configs: mountCount > 0 };

  function goTab(id: (typeof tabs)[number]["id"]) {
    setTab(id);
    document.getElementById(`create-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="page active" id="page-job-create">
      <div className="page-header">
        <div>
          <h1>{rerunId ? "重跑训练任务" : "创建训练任务"}</h1>
          <p className="desc">{rerunId ? "已载入原任务配置，按需修改团队 / 队列与参数后重新提交（IB 由所选队列决定）" : "选择团队与资源队列，按队列额度配置规格与启动参数后提交（IB 能力由所选队列决定）"}</p>
        </div>
      </div>
      {rerunId ? (
        <div className="demo-banner rerun-banner">
          {rerunQuery.data ? (
            <>基于任务 <strong className="mono">{rerunQuery.data.name}</strong> 创建，表单已回填源任务配置，提交将创建新的任务</>
          ) : (
            "基于任务创建，表单已回填源任务配置，提交将创建新的任务"
          )}
        </div>
      ) : null}
      <div className="wizard-layout">
        <div className="card job-create-form-card">
          <div className="tabs create-form-tabs" role="navigation" aria-label="任务表单章节">
            {tabs.map((item, idx) => (
              <button key={item.id} type="button" className={`tab ${tab === item.id ? "active" : ""} ${tabDone[item.id] ? "is-done" : ""}`} onClick={() => goTab(item.id)}>
                <span className="num">{idx + 1}</span>
                <span className="create-tab-copy">
                  <span className="create-tab-title">{item.title}</span>
                  <span className="create-tab-meta">{tabMeta[item.id]}</span>
                </span>
              </button>
            ))}
          </div>
          <div id="create-form-panels">
              <div className="tab-panel create-form-section" id="create-section-basic" data-panel="basic">
                <div className="form-section-title"><span className="num">1</span> 基本信息</div>
                <div className="form-grid">
                  <div className={groupClass(nameError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="create-name">任务名称 <span className="req">*</span></label>
                      <FieldHelp tip="即 Volcano Job 对象名，须符合 Kubernetes DNS-1123：小写字母、数字、连字符与点，最长 63，不能以连字符或点开头或结尾，也不能使用下划线或大写。重跑时可沿用原名称或追加后缀。" label="任务名称说明" />
                    </div>
                    <input id="create-name" autoComplete="off" maxLength={K8S_QNAME_MAX} {...methods.register("name")} {...invalidProps("create-name", nameError)} placeholder="例如 slm-7b-pretrain-phase4" />
                    <FieldError id="create-name-error">{nameError}</FieldError>
                  </div>
                  {isAdmin ? (
                    <div className="form-group full" id="create-run-user-group">
                      <div className="field-label-row">
                        <label htmlFor="create-run-user-search">运行用户 <span className="req">*</span></label>
                        <FieldHelp tip="本地 admin 不在 LDAP 中，不能作为容器运行身份。请检索平台已接入的 LDAP 用户；任务将以该用户 UID 与家目录运行。" label="运行用户说明" />
                      </div>
                      <div className="user-picker" id="create-run-user-picker">
                        <div className="user-picker-control">
                          <span className="user-picker-icon" aria-hidden="true" />
                          <input
                            id="create-run-user-search"
                            ref={runSearchRef}
                            value={runUser ? `${runUser.nickname}（${runUser.username}）` : runQuery}
                            readOnly={Boolean(runUser)}
                            className={runUser ? "is-locked" : undefined}
                            placeholder="搜索姓名 / 账号 / 邮箱 / 部门..."
                            autoComplete="off"
                            aria-autocomplete="list"
                            aria-controls="create-run-user-results"
                            onChange={(e) => {
                              setRunQuery(e.target.value);
                              setRunPickerOpen(true);
                            }}
                            onFocus={() => {
                              if (!runUser) setRunPickerOpen(true);
                            }}
                            onBlur={() => window.setTimeout(() => setRunPickerOpen(false), 120)}
                          />
                          {runUser ? (
                            <button
                              type="button"
                              className="user-picker-clear"
                              id="create-run-user-clear"
                              title="清除"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                applyRunUser(null);
                                setRunPickerOpen(true);
                                window.setTimeout(() => runSearchRef.current?.focus(), 0);
                              }}
                            >
                              ✕
                            </button>
                          ) : null}
                        </div>
                        {runUser ? (
                          <div className="user-picker-selected" id="create-run-user-selected">
                            <span className="user-picker-chip">
                              <span className="user-picker-chip-avatar">{initials(runUser.nickname || runUser.username)}</span>
                              <span className="user-picker-chip-meta">
                                <strong>{runUser.nickname}</strong>
                                <span className="mono text-muted">{runUser.username}</span>
                                {runUser.department ? <span className="text-muted">{runUser.department}</span> : null}
                              </span>
                            </span>
                          </div>
                        ) : null}
                        {runPickerOpen && !runUser ? (
                          <div className="user-picker-dropdown" id="create-run-user-results" role="listbox">
                            {runUsersQuery.isFetching && !runUsersQuery.data ? (
                              <div className="user-picker-empty">正在检索…</div>
                            ) : (runUsersQuery.data?.list ?? []).length === 0 ? (
                              <div className="user-picker-empty">{runQuery.trim() ? "无匹配的启用 LDAP 用户" : "暂无可用的平台 LDAP 用户"}</div>
                            ) : (
                              (runUsersQuery.data?.list ?? []).map((u) => (
                                <button
                                  type="button"
                                  key={u.id}
                                  className="user-picker-item"
                                  role="option"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => applyRunUser(u)}
                                >
                                  <span className="user-picker-item-avatar">{initials(u.nickname || u.username)}</span>
                                  <span className="user-picker-item-body">
                                    <span className="user-picker-item-line"><strong>{u.nickname}</strong> <span className="mono text-muted">{u.username}</span></span>
                                    <span className="user-picker-item-sub text-muted">{u.email || "—"} · {u.department || "—"}</span>
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                      <p className="field-help-text" id="create-run-user-hint">本地 admin 不在 LDAP。须指定一名平台 LDAP 用户作为运行身份，工作路径默认 /data/hpc/home/&lt;账号&gt;。</p>
                    </div>
                  ) : null}
                  <div className={groupClass(workdirError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="create-workdir">工作路径 <span className="req">*</span></label>
                      <FieldHelp tip="容器内训练进程的工作路径。默认 /data/hpc/home/&lt;运行用户账号&gt;，可按任务修改。" label="工作路径说明" />
                    </div>
                    <input id="create-workdir" className="mono" placeholder={isAdmin && !runUser ? WORKDIR_PLACEHOLDER : undefined} {...methods.register("workdir")} {...invalidProps("create-workdir", workdirError)} />
                    <FieldError id="create-workdir-error">{workdirError}</FieldError>
                  </div>
                  <div className="form-group full">
                    <div className="field-label-row">
                      <label>优先级 <span className="req">*</span></label>
                      <FieldHelp tip="用于多任务排队时的调度排序：P0 最高、P3 最低。同队列内高优先级任务优先获得资源。" label="优先级说明" />
                    </div>
                    <div className="job-priority-options" role="radiogroup" aria-label="任务优先级">
                      {priorityCards.map((p) => (
                        <label key={p.id} className={`job-priority-option ${form.priority === p.id ? "is-selected" : ""}`}>
                          <input type="radio" value={p.id} {...methods.register("priority")} />
                          <span className="job-priority-card">
                            <span className="job-priority-code">{p.id}</span>
                            <span className="job-priority-label">{p.label}</span>
                            <span className="job-priority-desc">{p.desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="tab-panel create-form-section" id="create-section-resources" data-panel="resources">
                <div className="form-section-title"><span className="num">2</span> 资源规格</div>
                <div className="form-grid">
                  <div className={groupClass(teamError)}>
                    <div className="field-label-row">
                      <label htmlFor="create-team">所属团队 <span className="req">*</span></label>
                      <FieldHelp tip="普通用户仅见自己加入的团队；平台管理员可选全部团队" label="所属团队说明" />
                    </div>
                    <select id="create-team" {...methods.register("teamId", { valueAsNumber: true })} {...invalidProps("create-team", teamError)}>
                      <option value={0}>请选择</option>
                      {(teamsQuery.data?.list ?? []).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <FieldError id="create-team-error">{teamError}</FieldError>
                  </div>
                  <div className={groupClass(queueError)}>
                    <div className="field-label-row">
                      <label htmlFor="create-queue">资源队列 <span className="req">*</span></label>
                      <FieldHelp tip="展示所选团队关联的资源队列；平台管理员可见该团队全部队列" label="资源队列说明" />
                    </div>
                    <select id="create-queue" {...methods.register("queueId", { valueAsNumber: true })} {...invalidProps("create-queue", queueError)}>
                      <option value={0}>请选择</option>
                      {queues.filter((q) => (q.enabled && !q.syncError) || q.id === Number(form.queueId)).map((q) => (
                        <option key={q.id} value={q.id}>{q.displayName}</option>
                      ))}
                    </select>
                    <FieldError id="create-queue-error">{queueError}</FieldError>
                  </div>
                </div>
                <div id="create-queue-quota" className="queue-quota-panel">
                  {selectedQueue ? (
                    <div className="queue-quota-card">
                      <div className={`queue-ib-capability ${ibOn ? "is-on" : "is-off"}`} role="status">
                        <div className="queue-ib-capability-body">
                          <div className="queue-ib-capability-title">{ibOn ? "该队列支持 IB 高速网络" : "该队列不支持 IB"}</div>
                          <div className="queue-ib-capability-desc">{ibOn ? "任务将调度至具备 InfiniBand 的节点，多机 NCCL 走 RDMA，并尽量落在同一 IB 拓扑域。" : "当前队列未开启 IB 功能特性，任务将按普通网络调度。如需 IB，请切换到支持 IB 的资源队列。"}</div>
                        </div>
                        <span className="queue-ib-capability-badge">{ibOn ? "IB 已启用" : "无 IB"}</span>
                      </div>
                      <div className="queue-quota-meta-row">
                        <span className="queue-quota-usage-title">资源分配情况</span>
                        <div className="queue-quota-meta-tags">
                          <span className="tag">{selectedQueue.gpuType}</span>
                          {ibOn ? <span className="tag tag-ib">IB</span> : null}
                        </div>
                      </div>
                      <div className="queue-quota-usage">
                        <div className="queue-quota-usage-item">
                          <div className="queue-capacity-bar-label">
                            <span>GPU</span>
                            <span className="mono">已用 <strong>{selectedQueue.gpuUsed}</strong> / {selectedQueue.gpuQuota} 卡 · 剩余 <strong className={gpuFree ? "text-success" : "text-danger"}>{gpuFree}</strong> · {gpuPct}%</span>
                          </div>
                          <div className="capacity-track"><div className={`capacity-fill ${quotaBarClass(gpuPct)}`} style={{ width: `${gpuPct}%` }} /></div>
                        </div>
                        <div className="queue-quota-usage-item">
                          <div className="queue-capacity-bar-label">
                            <span>CPU</span>
                            <span className="mono">已用 <strong>{selectedQueue.cpuUsed}</strong> / {selectedQueue.cpuQuota} 核 · 剩余 <strong className={cpuFree ? "text-success" : "text-danger"}>{cpuFree}</strong> · {cpuPct}%</span>
                          </div>
                          <div className="capacity-track"><div className={`capacity-fill ${quotaBarClass(cpuPct)}`} style={{ width: `${cpuPct}%` }} /></div>
                        </div>
                        <div className="queue-quota-usage-item">
                          <div className="queue-capacity-bar-label">
                            <span>内存</span>
                            <span className="mono">已用 <strong>{selectedQueue.memUsedGi}</strong> / {selectedQueue.memQuotaGi} Gi · 剩余 <strong className={memFree ? "text-success" : "text-danger"}>{memFree}</strong> · {memPct}%</span>
                          </div>
                          <div className="capacity-track"><div className={`capacity-fill ${quotaBarClass(memPct)}`} style={{ width: `${memPct}%` }} /></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 16 }}>请选择资源队列以查看额度与 IB 能力</div>
                  )}
                </div>
                <div className="create-spec-row">
                  <div className="form-group">
                    <label>节点数 <span className="req">*</span></label>
                    <input type="number" min={1} {...methods.register("nodes", { valueAsNumber: true })} />
                    <FieldError>{errText(methods.formState.errors, "nodes")}</FieldError>
                  </div>
                  <div className="form-group">
                    <label>每节点 GPU 数 <span className="req">*</span></label>
                    <input type="number" min={1} max={8} {...methods.register("gpusPerNode", { valueAsNumber: true })} />
                    <FieldError>{errText(methods.formState.errors, "gpusPerNode")}</FieldError>
                  </div>
                  <div className="form-group">
                    <div className="field-label-row">
                      <label htmlFor="create-gpu-type">GPU 型号</label>
                      <span className="field-lock-hint" title="由所选队列锁定">锁定</span>
                      <FieldHelp tip="随队列锁定，不可随意切换数据中心卡型" label="GPU 型号说明" />
                    </div>
                    <select id="create-gpu-type" disabled title="由所选队列决定" value={selectedQueue?.gpuType || ""}>
                      <option value={selectedQueue?.gpuType || ""}>{selectedQueue?.gpuType || "—"}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <div className="field-label-row">
                      <label>每节点 CPU <span className="req">*</span></label>
                      <FieldHelp tip="合计核数 = 节点数 × 每节点 CPU，计入队列 CPU 额度。" label="每节点 CPU 说明" />
                    </div>
                    <input type="number" min={1} {...methods.register("cpuPerNode", { valueAsNumber: true })} />
                  </div>
                  <div className="form-group">
                    <div className="field-label-row">
                      <label>每节点内存 <span className="req">*</span></label>
                      <FieldHelp tip="合计内存 = 节点数 × 每节点内存，计入队列内存额度。" label="每节点内存说明" />
                    </div>
                    <input type="number" min={1} {...methods.register("memGiPerNode", { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
              <div className="tab-panel create-form-section" id="create-section-launch" data-panel="launch">
                <div className="form-section-title"><span className="num">3</span> 镜像与启动</div>
                <div className="form-grid">
                  <div className={groupClass(imageError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="create-image">容器镜像 <span className="req">*</span></label>
                      <FieldHelp tip="算法同学自行编译并推送到 Harbor 后，在此粘贴完整镜像地址，格式 registry/project/name:tag。" label="容器镜像说明" />
                    </div>
                    <input id="create-image" className="mono" {...methods.register("image")} placeholder="harbor.msxf.com/ai/your-image:tag" {...invalidProps("create-image", imageError)} />
                    <FieldError id="create-image-error">{imageError}</FieldError>
                  </div>
                  <div className={groupClass(commandError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="create-command">启动命令 <span className="req">*</span></label>
                      <FieldHelp tip="填写训练进程入口。可直接引用平台注入的 $MASTER_ADDR、$MASTER_PORT、$WORLD_SIZE、$RANK、$GPU_NUM。" label="启动命令说明" />
                    </div>
                    <div className="code-editor code-editor--field code-editor--cmd">
                      <textarea id="create-command" className="code-editor-input" rows={5} {...methods.register("command")} placeholder="torchrun --nproc_per_node=$GPU_NUM --nnodes=$WORLD_SIZE ..." />
                    </div>
                    <FieldError id="create-command-error">{commandError}</FieldError>
                    <div className="builtin-env-note">
                      <div className="builtin-env-note-head">
                        <div className="builtin-env-note-title">平台内置环境变量</div>
                        <p className="builtin-env-note-desc">启动前由平台注入，可在启动命令中用 $变量名 引用，不必写进下方用户环境变量。</p>
                      </div>
                      <dl className="builtin-env-list">
                        <div className="builtin-env-item"><dt className="mono">$MASTER_ADDR</dt><dd>PyTorch 训练任务 master 节点地址</dd></div>
                        <div className="builtin-env-item"><dt className="mono">$MASTER_PORT</dt><dd>PyTorch 训练任务 master 节点端口</dd></div>
                        <div className="builtin-env-item"><dt className="mono">$WORLD_SIZE</dt><dd>PyTorch 训练任务总节点数</dd></div>
                        <div className="builtin-env-item"><dt className="mono">$RANK</dt><dd>PyTorch 训练任务节点序号</dd></div>
                        <div className="builtin-env-item"><dt className="mono">$GPU_NUM</dt><dd>PyTorch 训练任务各节点的 GPU 数量</dd></div>
                      </dl>
                    </div>
                  </div>
                  <div className="form-group full">
                    <div className="field-label-row">
                      <label>环境变量（KEY=VALUE，每行一个）</label>
                      <FieldHelp tip="用户自定义变量，每行一个 KEY=VALUE。$MASTER_ADDR、$GPU_NUM 等由平台注入，无需在此重复填写。" label="环境变量说明" />
                    </div>
                    <div className="code-editor code-editor--field code-editor--env">
                      <textarea rows={4} className="code-editor-input" {...methods.register("envText")} placeholder="EPOCHS=1000" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="tab-panel create-form-section" id="create-section-configs" data-panel="configs">
                <div className="form-section-title"><span className="num">4</span> 配置挂载</div>
                {mounts.map((m, idx) => (
                  <div key={idx} className="cfg-mount-card">
                    <div className="cfg-mount-card-head">
                      <strong style={{ fontSize: 13 }}>配置集挂载</strong>
                      <Button variant="danger" size="sm" onClick={() => setMounts((all) => all.filter((_, i) => i !== idx))}>删除</Button>
                    </div>
                    <div className="cfg-mount-grid">
                      <div className="form-group">
                        <label>配置集</label>
                        <select value={m.setId} onChange={(e) => setMounts((all) => all.map((x, i) => (i === idx ? { ...x, setId: Number(e.target.value), version: configsQuery.data?.list.find((c) => c.id === Number(e.target.value))?.latestVersion || 1 } : x)))}>
                          <option value={0}>选择配置集</option>
                          {(configsQuery.data?.list ?? []).filter((c) => c.latestVersion > 0).map((c) => (
                            <option key={c.id} value={c.id}>{c.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>挂载路径</label>
                        <input className="mono" value={m.mountPath} onChange={(e) => setMounts((all) => all.map((x, i) => (i === idx ? { ...x, mountPath: e.target.value } : x)))} placeholder="挂载路径" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="cfg-add-mount" onClick={() => setMounts((all) => [...all, { setId: 0, version: 1, mountPath: `/data/hpc/home/${runUser?.username || user?.username || "user"}/experiments/${form.name || "job"}/configs` }])}>
                  <span className="cfg-add-mount-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                  <span className="cfg-add-mount-copy">
                    <span className="cfg-add-mount-title">添加配置集</span>
                    <span className="cfg-add-mount-desc">从配置管理选择一版 YAML，只读挂到容器内指定路径</span>
                  </span>
                  <span className="cfg-add-mount-chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
              </div>
          </div>
          <div className="create-form-footer">
            <div className="flex gap-8">
              <Button variant="secondary" onClick={() => navigate("/training/jobs")}>取消</Button>
              <Button className="btn-lg" onClick={onSubmit} disabled={save.isPending || !clusterId}>{rerunId ? "确认重跑" : "提交训练任务"}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

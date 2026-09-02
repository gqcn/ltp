import { useEffect, useMemo, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { createJob, getConfig, getConfigVersion, getJob, listConfigs, listExperimentProjects, listMyQueues, listRunUsers, type ConfigFile, type ConfigItem, type MyQueue, type RunUser } from "@/api/training";
import { readSession } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { CodeEditor, CodeViewer } from "@/components/CodeEditor";
import { FieldError, FieldHelp } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";
import { cn } from "@/lib/cn";
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
  projectId: z.coerce.number().optional(),
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
const CONFIG_MOUNT_PATH_PATTERN = "/data/hpc/home/<username>/experiments/<任务名称>/configs/";
const LATEST_AT_SUBMIT = "latest_at_submit";
const DEMO_TRAIN_IMAGE = "ltp/experiment-agent:dev";
const DEMO_TRAIN_COMMAND = "python /opt/agent/agent.py demo";

type MountVersion = number | typeof LATEST_AT_SUBMIT;
type MountMode = "dir" | "files";
type MountDraft = {
  uid: string;
  setId: number;
  version: MountVersion;
  mode: MountMode;
  mountPath: string;
  selected: string[] | null;
  preview: boolean;
  isPlatformGenerated: boolean;
};

function jobNameForConfigPath(taskName: string) {
  return (
    taskName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unnamed"
  );
}

function defaultConfigMountPath(username: string, taskName: string) {
  const user = username.trim() || "<username>";
  return `/data/hpc/home/${user}/experiments/${jobNameForConfigPath(taskName)}/configs`;
}

function normalizeMountPath(path: string) {
  return path.trim().replace(/\/+$/, "") || "/";
}

function isPlatformGeneratedMountPath(path: string) {
  const p = normalizeMountPath(path);
  return p === "/workspace/configs" || /^\/data\/hpc\/home\/[^/]+\/experiments\/[^/]+\/configs$/.test(p);
}

function mountPathsConflict(a: string, b: string) {
  const left = normalizeMountPath(a);
  const right = normalizeMountPath(b);
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function commandNeedsConfigsHint(command: string) {
  return /(^|[\s=])configs\//.test(command || "");
}

function newMountDraft(username: string, taskName: string, partial: Partial<MountDraft> = {}): MountDraft {
  const generated = defaultConfigMountPath(username, taskName);
  const mountPath = partial.mountPath || generated;
  return {
    uid: partial.uid || `m${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    setId: partial.setId || 0,
    version: partial.version ?? LATEST_AT_SUBMIT,
    mode: partial.mode || "dir",
    mountPath,
    selected: partial.selected ?? null,
    preview: Boolean(partial.preview),
    isPlatformGenerated: partial.isPlatformGenerated ?? isPlatformGeneratedMountPath(mountPath),
  };
}

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
  const presetProject = Number(params.get("projectId") || 0);
  const { clusterId } = useWorkingCluster("training");
  const session = useQuery({ queryKey: ["session"], queryFn: readSession });
  const user = session.data?.user;
  const isAdmin = Boolean(user?.isAdmin);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("basic");
  const [tabsStuck, setTabsStuck] = useState(false);
  const [runQuery, setRunQuery] = useState("");
  const [runUser, setRunUser] = useState<RunUser | null>(null);
  const [runPickerOpen, setRunPickerOpen] = useState(false);
  const [mounts, setMounts] = useState<MountDraft[]>([]);
  const [pendingUnmount, setPendingUnmount] = useState<MountDraft | null>(null);
  const runSearchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabScrollLock = useRef(false);
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
      projectId: presetProject,
    },
  });
  const form = methods.watch();
  const queuesQuery = useQuery({
    queryKey: ["training-my-queues", clusterId],
    queryFn: () => listMyQueues(clusterId!),
    enabled: Boolean(clusterId),
  });
  const teamsForSubmit = useMemo(() => {
    const names = new Map<number, string>();
    for (const q of queuesQuery.data?.list ?? []) {
      if (!q.enabled || q.syncError) {
        continue;
      }
      for (const t of q.teams) {
        if (t.id > 0) {
          names.set(t.id, t.name);
        }
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }, [queuesQuery.data]);
  const projectsQuery = useQuery({
    queryKey: ["exp-projects", clusterId],
    queryFn: () => listExperimentProjects(clusterId!),
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
      projectId: methods.getValues("projectId") || presetProject,
    });
    const username = job.ownerUsername || user?.username || "";
    const nextName = rerunJobName(job.name);
    setMounts(
      (job.mounts || []).map((m) =>
        newMountDraft(username, nextName, {
          setId: m.setId,
          version: m.version,
          mountPath: isPlatformGeneratedMountPath(m.mountPath) ? defaultConfigMountPath(username, nextName) : m.mountPath,
        }),
      ),
    );
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
  }, [rerunQuery.data, session.isFetched, queuesQuery.isFetched, clusterId, isAdmin, methods]);

  useEffect(() => {
    if (!queuesQuery.isFetched) {
      return;
    }
    const teamId = Number(methods.getValues("teamId"));
    if (!teamId || teamsForSubmit.some((item) => item.id === teamId)) {
      return;
    }
    methods.setValue("teamId", 0);
    methods.setValue("queueId", 0);
  }, [queuesQuery.isFetched, teamsForSubmit, methods]);

  useEffect(() => {
    if (!presetConfig || mounts.length) return;
    const cfg = (configsQuery.data?.list ?? []).find((c) => c.id === presetConfig && c.latestVersion > 0);
    if (!cfg) return;
    const username = runUser?.username || user?.username || "";
    const taskName = methods.getValues("name");
    setMounts([
      newMountDraft(username, taskName, {
        setId: cfg.id,
        version: presetConfigVer || LATEST_AT_SUBMIT,
      }),
    ]);
  }, [presetConfig, configsQuery.data, mounts.length, runUser?.username, user?.username, methods]);

  const configUsername = runUser?.username || (!isAdmin ? user?.username || "" : "");
  useEffect(() => {
    const next = defaultConfigMountPath(configUsername, form.name);
    setMounts((all) => {
      let changed = false;
      const mapped = all.map((m) => {
        if (!m.isPlatformGenerated || m.mountPath === next) return m;
        changed = true;
        return { ...m, mountPath: next };
      });
      return changed ? mapped : all;
    });
  }, [configUsername, form.name]);

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
        mounts: mounts.flatMap((m) => {
          const version = m.version === LATEST_AT_SUBMIT
            ? (configsQuery.data?.list ?? []).find((c) => c.id === m.setId)?.latestVersion || 0
            : m.version;
          if (!m.setId || !version) return [];
          return [{
            setId: m.setId,
            version,
            mountPath: m.mountPath,
            files: m.mode === "files" ? m.selected ?? undefined : undefined,
          }];
        }),
        runUserId: isAdmin ? runUser?.id : undefined,
        rerunFromId: rerunId || undefined,
        projectId: Number(form.projectId) || undefined,
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

  useEffect(() => {
    function syncTabsFromScroll() {
      const tabsEl = tabsRef.current;
      if (!tabsEl) {
        return;
      }
      const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 56;
      setTabsStuck(tabsEl.getBoundingClientRect().top <= topbarBottom + 0.5);
      if (tabScrollLock.current) {
        return;
      }
      const offset = tabsEl.getBoundingClientRect().bottom + 12;
      let current: (typeof tabs)[number]["id"] = tabs[0].id;
      for (const item of tabs) {
        const section = document.getElementById(`create-section-${item.id}`);
        if (!section) {
          continue;
        }
        if (section.getBoundingClientRect().top <= offset) {
          current = item.id;
        }
      }
      setTab((prev) => (prev === current ? prev : current));
    }
    syncTabsFromScroll();
    window.addEventListener("scroll", syncTabsFromScroll, true);
    window.addEventListener("resize", syncTabsFromScroll);
    return () => {
      window.removeEventListener("scroll", syncTabsFromScroll, true);
      window.removeEventListener("resize", syncTabsFromScroll);
    };
  }, []);

  function fillLocalDemo() {
    methods.setValue("name", `demo-exp-${Date.now().toString(36)}`, { shouldDirty: true, shouldValidate: true });
    methods.setValue("image", DEMO_TRAIN_IMAGE, { shouldDirty: true, shouldValidate: true });
    methods.setValue("command", DEMO_TRAIN_COMMAND, { shouldDirty: true, shouldValidate: true });
    methods.setValue("nodes", 1, { shouldDirty: true, shouldValidate: true });
    methods.setValue("gpusPerNode", 1, { shouldDirty: true, shouldValidate: true });
    methods.setValue("cpuPerNode", 1, { shouldDirty: true, shouldValidate: true });
    methods.setValue("memGiPerNode", 1, { shouldDirty: true, shouldValidate: true });
    methods.setValue("priority", "P2", { shouldDirty: true });
    goTab("launch");
    toast.success("已填入本地演示训练，提交后会写入 Loss、进度和吞吐");
  }

  function goTab(id: (typeof tabs)[number]["id"]) {
    setTab(id);
    tabScrollLock.current = true;
    document.getElementById(`create-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      tabScrollLock.current = false;
    }, 450);
  }

  return (
    <section className="page active" id="page-job-create">
      <div className="page-header">
        <div>
          <h1>{rerunId ? "重跑训练任务" : "创建训练任务"}</h1>
          <p className="desc">{rerunId ? "已载入原任务配置，按需修改团队 / 队列与参数后重新提交（IB 由所选队列决定）" : "选择团队与资源队列，按队列额度配置规格与启动参数后提交（IB 能力由所选队列决定）"}</p>
        </div>
        {!rerunId ? (
          <div className="page-actions">
            <Button type="button" variant="secondary" size="sm" onClick={fillLocalDemo}>填入本地演示训练</Button>
          </div>
        ) : null}
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
          <div id="create-form-tabs" ref={tabsRef} className={cn("tabs create-form-tabs", tabsStuck && "is-stuck")} role="navigation" aria-label="任务表单章节">
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
                  <div className={groupClass(nameError)}>
                    <div className="field-label-row">
                      <label htmlFor="create-name">任务名称 <span className="req">*</span></label>
                      <FieldHelp tip="即 Volcano Job 对象名，须符合 Kubernetes DNS-1123：小写字母、数字、连字符与点，最长 63，不能以连字符或点开头或结尾，也不能使用下划线或大写。重跑时可沿用原名称或追加后缀。" label="任务名称说明" />
                    </div>
                    <input id="create-name" autoComplete="off" maxLength={K8S_QNAME_MAX} {...methods.register("name")} {...invalidProps("create-name", nameError)} placeholder="例如 slm-7b-pretrain-phase4" />
                    <FieldError id="create-name-error">{nameError}</FieldError>
                  </div>
                  {isAdmin ? (
                    <div className="form-group" id="create-run-user-group">
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
                    </div>
                  ) : null}
                  <div className={groupClass(workdirError)}>
                    <div className="field-label-row">
                      <label htmlFor="create-workdir">工作路径 <span className="req">*</span></label>
                      <FieldHelp tip="容器内训练进程的工作路径。默认 /data/hpc/home/&lt;运行用户账号&gt;，可按任务修改。" label="工作路径说明" />
                    </div>
                    <input id="create-workdir" className="mono" placeholder={isAdmin && !runUser ? WORKDIR_PLACEHOLDER : undefined} {...methods.register("workdir")} {...invalidProps("create-workdir", workdirError)} />
                    <FieldError id="create-workdir-error">{workdirError}</FieldError>
                  </div>
                  <div className={isAdmin ? "form-group" : "form-group full"}>
                    <div className="field-label-row">
                      <label htmlFor="create-project">实验项目</label>
                      <FieldHelp tip="提交成功后会在该项目下创建一条实验 Run。不选则挂到默认项目。" label="实验项目说明" />
                    </div>
                    <Controller
                      name="projectId"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          id="create-project"
                          value={String(field.value || 0)}
                          options={[
                            { value: "0", label: "默认项目" },
                            ...(projectsQuery.data?.list ?? [])
                              .filter((p) => p.name !== "default")
                              .map((p) => ({ value: String(p.id), label: p.displayName || p.name })),
                          ]}
                          onChange={(next) => field.onChange(Number(next))}
                        />
                      )}
                    />
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
                      <FieldHelp tip="仅列出当前工作集群中已关联可用队列的团队，未绑定队列的团队不出现。普通用户仅见自己加入的团队；平台管理员与 SRE 可见本集群全部已关联队列的团队。" label="所属团队说明" />
                    </div>
                    <Controller
                      name="teamId"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          id="create-team"
                          value={String(field.value ?? 0)}
                          options={[
                            { value: "0", label: "请选择" },
                            ...teamsForSubmit.map((t) => ({ value: String(t.id), label: t.name })),
                          ]}
                          onChange={(next) => field.onChange(Number(next))}
                          {...invalidProps("create-team", teamError)}
                        />
                      )}
                    />
                    <FieldError id="create-team-error">{teamError}</FieldError>
                  </div>
                  <div className={groupClass(queueError)}>
                    <div className="field-label-row">
                      <label htmlFor="create-queue">资源队列 <span className="req">*</span></label>
                      <FieldHelp tip="展示所选团队关联的资源队列；平台管理员可见该团队全部队列" label="资源队列说明" />
                    </div>
                    <Controller
                      name="queueId"
                      control={methods.control}
                      render={({ field }) => (
                        <Select
                          id="create-queue"
                          value={String(field.value ?? 0)}
                          options={[
                            { value: "0", label: "请选择" },
                            ...queues
                              .filter((q) => (q.enabled && !q.syncError) || q.id === Number(form.queueId))
                              .map((q) => ({ value: String(q.id), label: q.displayName })),
                          ]}
                          onChange={(next) => field.onChange(Number(next))}
                          {...invalidProps("create-queue", queueError)}
                        />
                      )}
                    />
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
                    <Select
                      id="create-gpu-type"
                      disabled
                      title="由所选队列决定"
                      value={selectedQueue?.gpuType || ""}
                      options={[{ value: selectedQueue?.gpuType || "", label: selectedQueue?.gpuType || "—" }]}
                      onChange={() => undefined}
                    />
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
                      <Controller
                        name="command"
                        control={methods.control}
                        render={({ field }) => (
                          <CodeEditor
                            id="create-command"
                            language="shell"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            inputRef={field.ref}
                            placeholder="torchrun --nproc_per_node=$GPU_NUM --nnodes=$WORLD_SIZE ..."
                            wrap
                            lineNumbers={false}
                            minHeight={108}
                            invalid={Boolean(commandError)}
                            aria-label="启动命令"
                            aria-describedby={commandError ? "create-command-error" : undefined}
                          />
                        )}
                      />
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
                      <Controller
                        name="envText"
                        control={methods.control}
                        render={({ field }) => (
                          <CodeEditor
                            language="env"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            inputRef={field.ref}
                            placeholder="EPOCHS=1000"
                            wrap
                            lineNumbers={false}
                            minHeight={120}
                            aria-label="环境变量"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="tab-panel create-form-section" id="create-section-configs" data-panel="configs">
                <div className="form-section-title"><span className="num">4</span> 配置挂载</div>
                <div id="create-config-mounts">
                  {mounts.map((m) => (
                    <ConfigMountCard
                      key={m.uid}
                      mount={m}
                      configs={(configsQuery.data?.list ?? []).filter((c) => c.latestVersion > 0)}
                      defaultPath={defaultConfigMountPath(configUsername, form.name)}
                      conflict={mounts.some((other) => other.uid !== m.uid && mountPathsConflict(m.mountPath, other.mountPath))}
                      onChange={(next) => setMounts((all) => all.map((x) => (x.uid === next.uid ? next : x)))}
                      onDelete={() => setPendingUnmount(m)}
                    />
                  ))}
                </div>
                <div
                  id="create-config-hint"
                  className="cfg-mount-hint"
                  hidden={!(commandNeedsConfigsHint(form.command) && mounts.length > 0 && !mounts.some((m) => normalizeMountPath(m.mountPath) === defaultConfigMountPath(configUsername, form.name)))}
                >
                  启动命令引用了相对路径 configs/，当前挂载不在 {CONFIG_MOUNT_PATH_PATTERN}。请改用绝对 --config，或改回平台默认路径。
                </div>
                <button
                  type="button"
                  className={cn("cfg-add-mount", mounts.length > 0 && "is-compact")}
                  id="btn-add-config-mount"
                  onClick={() => setMounts((all) => [...all, newMountDraft(configUsername, form.name)])}
                >
                  <span className="cfg-add-mount-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                  <span className="cfg-add-mount-copy">
                    <span className="cfg-add-mount-title">{mounts.length ? "继续添加配置集" : "添加配置集"}</span>
                    <span className="cfg-add-mount-desc">
                      {mounts.length ? "可再挂另一套配置；路径不能相同或互为前缀" : `从配置管理选择一版 YAML，默认挂到 ${CONFIG_MOUNT_PATH_PATTERN}`}
                    </span>
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
      <Modal
        open={Boolean(pendingUnmount)}
        title="确认删除挂载"
        confirmText="确认删除"
        confirmVariant="danger"
        modalClassName="modal-confirm"
        onClose={() => setPendingUnmount(null)}
        onConfirm={() => {
          if (!pendingUnmount) return;
          setMounts((all) => all.filter((x) => x.uid !== pendingUnmount.uid));
          setPendingUnmount(null);
          toast.success("已删除配置挂载");
        }}
      >
        <p className="modal-msg">
          确定删除这条配置文件挂载
          <strong> {(configsQuery.data?.list ?? []).find((c) => c.id === pendingUnmount?.setId)?.displayName || "未选择配置集"} </strong>
          吗？
        </p>
        <p className="modal-hint is-warning">删除后提交任务将不再挂载该配置集，可随时重新添加。</p>
      </Modal>
    </section>
  );
}

function ConfigMountCard({
  mount,
  configs,
  defaultPath,
  conflict,
  onChange,
  onDelete,
}: {
  mount: MountDraft;
  configs: ConfigItem[];
  defaultPath: string;
  conflict: boolean;
  onChange: (next: MountDraft) => void;
  onDelete: () => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["training-config", mount.setId],
    queryFn: () => getConfig(mount.setId),
    enabled: mount.setId > 0,
  });
  const pinned = typeof mount.version === "number" ? mount.version : 0;
  const latest = detailQuery.data?.latestVersion || 0;
  const needPinnedFiles = mount.setId > 0 && pinned > 0 && pinned !== latest && (mount.mode === "files" || mount.preview);
  const versionQuery = useQuery({
    queryKey: ["training-config-version", mount.setId, pinned],
    queryFn: () => getConfigVersion(mount.setId, pinned),
    enabled: needPinnedFiles,
  });
  const files: ConfigFile[] = needPinnedFiles ? versionQuery.data?.files ?? [] : detailQuery.data?.files ?? [];
  const selectedFiles = mount.mode === "files" && mount.selected ? files.filter((f) => mount.selected?.includes(f.path)) : files;
  const versions = [...(detailQuery.data?.versions ?? [])].sort((a, b) => b.version - a.version).slice(0, 20);
  const previewText = selectedFiles.map((f) => `--- ${f.path} ---\n${f.content || ""}`).join("\n\n");

  return (
    <div className={cn("cfg-mount-card", conflict && "is-conflict")}>
      <div className="cfg-mount-card-head">
        <strong style={{ fontSize: 13 }}>配置集挂载</strong>
        <Button variant="danger" size="sm" onClick={onDelete}>删除</Button>
      </div>
      <div className="cfg-mount-grid">
        <div className="form-group">
          <label>配置集</label>
          <Select
            aria-label="配置集"
            value={String(mount.setId)}
            options={[
              { value: "0", label: "选择配置集" },
              ...configs.map((c) => ({ value: String(c.id), label: c.displayName })),
            ]}
            onChange={(next) => onChange({ ...mount, setId: Number(next), version: LATEST_AT_SUBMIT, selected: null, preview: false })}
          />
        </div>
        <div className="form-group">
          <label>版本</label>
          <Select
            aria-label="版本"
            value={mount.setId ? (mount.version === LATEST_AT_SUBMIT ? LATEST_AT_SUBMIT : String(mount.version)) : ""}
            options={
              mount.setId
                ? [
                    { value: LATEST_AT_SUBMIT, label: "提交时最新（提交瞬间钉死，不会跟着改）" },
                    { value: "__sep__", label: "────────", isDisabled: true },
                    ...versions.map((v) => ({
                      value: String(v.version),
                      label: `v${v.version}${v.version === latest ? " · 当前最新" : ""}`,
                    })),
                  ]
                : [{ value: "", label: "先选择配置集" }]
            }
            onChange={(next) => {
              onChange({
                ...mount,
                version: next === LATEST_AT_SUBMIT ? LATEST_AT_SUBMIT : Number(next),
                selected: null,
              });
            }}
          />
        </div>
        <div className="form-group">
          <label>挂载方式</label>
          <Select
            aria-label="挂载方式"
            value={mount.mode}
            options={[
              { value: "dir", label: "整包目录" },
              { value: "files", label: "按文件" },
            ]}
            onChange={(next) => onChange({ ...mount, mode: next as MountMode, selected: null })}
          />
        </div>
        <div className="form-group full">
          <div className="field-label-row">
            <label>容器路径</label>
            <span className="cfg-mount-path-hint">挂载的配置将会覆盖同目录下的同名文件</span>
          </div>
          <input
            className="mono cfg-mount-path-input"
            value={mount.mountPath}
            onChange={(e) => {
              const next = e.target.value;
              onChange({ ...mount, mountPath: next, isPlatformGenerated: false });
            }}
            onBlur={() => {
              const next = normalizeMountPath(mount.mountPath || defaultPath);
              onChange({ ...mount, mountPath: next, isPlatformGenerated: next === defaultPath });
            }}
            placeholder="容器内只读挂载路径"
          />
        </div>
        {mount.mode === "files" ? (
          <div className="form-group full">
            <div className="cfg-mount-files">
              {files.map((f) => {
                const on = !mount.selected || mount.selected.includes(f.path);
                return (
                  <label key={f.path} className="cfg-mount-file-row">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const all = files.map((item) => item.path);
                        const next = new Set(mount.selected || all);
                        if (e.target.checked) next.add(f.path);
                        else next.delete(f.path);
                        onChange({ ...mount, selected: [...next] });
                      }}
                    />
                    <span className="mono">{f.path}</span>
                    <span className="mono text-muted">{`${normalizeMountPath(mount.mountPath)}/${f.path}`}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {conflict ? <div className="cfg-mount-error">CONFIG_MOUNT_CONFLICT：挂载路径不得相等，也不得互为目录前缀</div> : null}
      {mount.setId ? (
        <div className="cfg-mount-preview-wrap">
          <button
            type="button"
            className={cn("cfg-preview-btn", mount.preview && "is-open")}
            aria-expanded={mount.preview}
            onClick={() => onChange({ ...mount, preview: !mount.preview })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {mount.preview ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            <span>{mount.preview ? "收起预览" : "预览文件"}</span>
          </button>
          {mount.preview ? (
            <CodeViewer className="cfg-mount-preview" language="yaml" value={previewText} wrap minHeight={160} aria-label="配置挂载预览" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

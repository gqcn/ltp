/* AI Training Platform Prototype — App Logic */

(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  let currentJobId = "job-20260727-001";
  /** 重跑时来源任务 ID；null 表示新建 */
  let rerunFromJobId = null;
  /** 从配置管理「用于创建任务」写入，renderJobCreate 消费后清空 */
  let pendingConfigMount = null;
  let currentConfigSetId = null;
  let configEditIsNew = false;
  let configEditor = null;
  let pendingConfigDirtyLeave = null;
  let pendingConfigFilePath = null;
  let pendingUnmountUid = null;
  let pendingArchiveSetId = null;
  let pendingArchiveRestore = false;
  let createConfigMounts = [];
  let createMountUid = 1;
  let createFormTab = "basic";
  let createFormScrollLock = 0;
  let cfgEditScrollLock = 0;
  /** 队列表单当前勾选的关联团队 id（支持多个） */
  let queueFormTeamIds = [];
  /** 用户是否手动改过每节点 CPU / 内存（未改时随卡型与每节点 GPU 同步默认配比） */
  let createCpuMemManual = false;
  const CREATE_FORM_TABS = ["basic", "resources", "launch", "configs"];
  const CFG_EDIT_TABS = ["basic", "files", "publish"];
  const configListState = {
    q: "",
    teamId: "all",
    scope: "all",
    status: "all",
    framework: "all",
    page: 1,
    pageSize: 10,
  };
  const CONFIG_TEMPLATES = {
    megatron: [
      { path: "model.yaml", kind: "config", content: "seq_len: 8192\nhidden_size: 4096\nnum_layers: 32\n" },
      { path: "parallel.yaml", kind: "config", content: "tp: 2\npp: 4\ncp: 1\n" },
      { path: "data.yaml", kind: "config", content: "data_path: /share/slm/datasets/mix-v3\nsplit: 98,2,0\n" },
      { path: "optimizer.yaml", kind: "config", content: "lr: 3.0e-4\nmin_lr: 3.0e-5\nweight_decay: 0.1\n" },
      { path: "tokenizer.yaml", kind: "config", content: "tokenizer_type: HuggingFaceTokenizer\ntokenizer_model: /share/slm/tokenizers/v3\n" },
    ],
    nemo: [
      { path: "config.yaml", kind: "config", content: "defaults:\n  - model: gpt\n  - data: blend\n  - optim: adam\n" },
      { path: "model/gpt.yaml", kind: "config", content: "micro_batch_size: 2\nglobal_batch_size: 1024\n" },
      { path: "data/blend.yaml", kind: "config", content: "datasets:\n  - /share/sft/datasets/sft-mix-v2\n" },
      { path: "optim/adam.yaml", kind: "config", content: "lr: 3.0e-4\n" },
    ],
    accelerate: [
      {
        path: "default_config.yaml",
        kind: "config",
        content: "distributed_type: MULTI_GPU\nmixed_precision: bf16\nnum_machines: 1\n",
      },
    ],
    custom: [],
  };
  let logKeyword = "";
  /** 日志检索：Pod 过滤，all 表示全部 */
  let logSearchPod = "all";
  /** 日志检索：时间排序 asc 正序 / desc 倒序 */
  let logSearchSort = "asc";
  /** 日志检索：时间范围 */
  let logSearchRange = "6h";
  /** 任务详情：当前选中的 Pod 名称 */
  let selectedPodName = null;
  /** 创建页：上次自动填入的工作路径默认值（用户改过则不再覆盖） */
  let lastCreateWorkdirDefault = "";

  /** 实验分析 */
  let currentExpId = null;
  const expListState = {
    page: 1,
    pageSize: 10,
    projectId: "all",
    selectedIds: new Set(),
    chartMetrics: ["train_loss", "val_loss", "lr", "tokens_per_sec"],
  };
  const EXP_COMPARE_COLORS = ["#22d3ee", "#a78bfa", "#f59e0b", "#22c55e", "#f472b6", "#60a5fa"];
  const AUTH_KEY = "maip_auth_v1";
  const AUTH_HANDOFF_KEY = "maip_auth_handoff_v1";
  const THEME_KEY = "maip_theme_v1";
  const SIDEBAR_KEY = "maip_sidebar_v1";

  /** 管理中心：当前选中的团队 */
  let currentTeamId = "team-slm";
  let queueMgmtFilter = { dc: "all", gpuType: "all", status: "all", q: "", page: 1, pageSize: 10 };
  let userMgmtFilter = { status: "all", roleId: "all", teamId: "all", q: "", page: 1, pageSize: 10 };
  /** 用户管理多选（username 集合） */
  let userMgmtSelected = new Set();
  /** 用户角色授权弹窗：目标用户名列表 */
  let pendingUserRoleUsernames = null;
  /** 角色改名弹窗：目标角色 id */
  let pendingRoleRenameId = null;
  let teamMgmtFilter = { q: "", page: 1, pageSize: 10 };
  let clusterMgmtFilter = { q: "", page: 1, pageSize: 10 };
  let dcMgmtFilter = { page: 1, pageSize: 10 };
  let editingDcId = null;
  let pendingDcAction = null; // { action: delete|blocked, dcId }
  /** 右上角「当前集群」选择（节点管理等资源页按此切换） */
  let currentClusterId = null;
  let nodeMgmtFilter = {
    dc: "all",
    status: "all", // Ready | NotReady | SchedulingDisabled
    gpuType: "all",
    q: "",
    page: 1,
    pageSize: 10,
  };
  const nodeMgmtPageState = {
    tab: "nodes", // nodes | records
    opsAction: "all",
    opsQ: "",
    opsPage: 1,
    opsPageSize: 10,
  };
  let highlightNodeMgmtName = null;
  /** 节点管理多选（节点 name 集合） */
  let nodeMgmtSelected = new Set();
  /** 设置数据中心弹窗：待写入的节点 name 列表 */
  let pendingNodeDcNames = null;
  let editingClusterId = null;
  let pendingClusterDetailId = null;
  let pendingNodeDetailName = null;
  /** 标签编辑：目标节点列表；mode=replace 单节点全量替换，merge=批量合并写入 */
  let pendingNodeLabelsNames = null;
  let pendingNodeLabelsMode = "replace";
  let pendingNodeLabelsDraft = null; // { [key]: value }
  /** 污点编辑：同上 */
  let pendingNodeTaintsNames = null;
  let pendingNodeTaintsMode = "replace";
  let pendingNodeTaintsDraft = null; // [{ key, value, effect }]

  /* ---------- Domain helpers (角色 / 菜单权限) ---------- */
  const MENU_SECTION_LABELS = {
    training: "训练中心",
    ops: "运维中心",
    platform: "平台中心",
  };

  /** 页面归属的菜单分区 */
  const PAGE_MENU_SECTION = {
    jobs: "training",
    "job-create": "training",
    "job-detail": "training",
    "my-queues": "training",
    configs: "training",
    "config-edit": "training",
    "config-detail": "training",
    experiments: "training",
    "exp-detail": "training",
    "exp-compare": "training",
    dashboard: "ops",
    "dc-mgmt": "ops",
    "cluster-mgmt": "ops",
    "node-mgmt": "ops",
    "queue-mgmt": "ops",
    alerts: "ops",
    maintenance: "ops",
    "user-mgmt": "platform",
    "team-mgmt": "platform",
    "role-mgmt": "platform",
    "system-config": "platform",
    platform: "platform",
  };

  function findRole(roleId) {
    return (MOCK.roles || []).find((r) => r.id === roleId) || null;
  }

  function getRoleName(roleId) {
    const r = findRole(roleId);
    return r?.name || "未授权";
  }

  function formatRoleMenus(role) {
    const menus = role?.menus || [];
    if (!menus.length) return "无菜单权限";
    return menus.map((m) => MENU_SECTION_LABELS[m] || m).join("、");
  }

  function roleMenusHint(roleId) {
    const r = findRole(roleId);
    if (!r) return "";
    return `可见菜单：${formatRoleMenus(r)}`;
  }

  /** 当前登录用户可访问的菜单分区（平台管理员全部） */
  function getCurrentUserMenus() {
    const user = MOCK.user || {};
    if (user.isAdmin || user.method === "admin") {
      return ["training", "ops", "platform"];
    }
    const role = findRole(user.roleId);
    return role?.menus ? [...role.menus] : ["training"];
  }

  function canAccessPage(page) {
    const section = PAGE_MENU_SECTION[page];
    if (!section) return true;
    return getCurrentUserMenus().includes(section);
  }

  function getDefaultHomePage() {
    const menus = getCurrentUserMenus();
    if (menus.includes("ops")) return "dashboard";
    if (menus.includes("training")) return "jobs";
    if (menus.includes("platform")) return "user-mgmt";
    return "jobs";
  }

  /** 按角色显示/隐藏侧栏菜单分区 */
  function applyNavPermissions() {
    const allowed = new Set(getCurrentUserMenus());
    $$(".nav-section[data-nav-section]").forEach((sec) => {
      const key = sec.dataset.navSection;
      sec.classList.toggle("is-nav-hidden", !allowed.has(key));
    });
  }

  function fillRoleSelectOptions(selectEl, selectedId, opts = {}) {
    if (!selectEl) return;
    const includeAll = !!opts.includeAll;
    const allLabel = opts.allLabel || "全部角色";
    const roles = MOCK.roles || [];
    const parts = [];
    if (includeAll) {
      parts.push(`<option value="all">${escapeHtml(allLabel)}</option>`);
    }
    roles.forEach((r) => {
      const sel = r.id === selectedId ? " selected" : "";
      parts.push(`<option value="${escapeHtml(r.id)}"${sel}>${escapeHtml(r.name)}</option>`);
    });
    selectEl.innerHTML = parts.join("");
  }

  function fillUserTeamFilterOptions(selectEl, selectedId) {
    if (!selectEl) return "all";
    const teams = [...(MOCK.teams || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh"));
    const parts = [`<option value="all">全部团队</option>`];
    teams.forEach((t) => {
      parts.push(`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`);
    });
    parts.push(`<option value="none">未加入团队</option>`);
    selectEl.innerHTML = parts.join("");
    const valid =
      selectedId === "all" || selectedId === "none" || teams.some((t) => t.id === selectedId);
    const next = valid ? selectedId || "all" : "all";
    selectEl.value = next;
    return next;
  }

  /* ---------- Domain helpers (数据中心 / 队列 / 团队) ---------- */
  function findDc(dcId) {
    if (!dcId) return null;
    return (MOCK.datacenters || []).find((d) => d.id === dcId) || null;
  }

  function dcName(dcId) {
    return findDc(dcId)?.name || dcId || "—";
  }

  function dcShort(dcId) {
    return findDc(dcId)?.short || dcId || "—";
  }

  function dcBadge(dcId) {
    if (!dcId) {
      return `<span class="dc-badge dc-badge-unset" title="节点尚未标记数据中心">未分配</span>`;
    }
    const d = findDc(dcId);
    if (!d) return `<span class="tag">${escapeHtml(dcId)}</span>`;
    return `<span class="dc-badge" style="--dc-color:${d.color || "var(--primary)"}">${escapeHtml(
      d.short || d.name
    )}</span>`;
  }

  /** 节点当前数据中心 id（字段优先，其次 label） */
  function nodeDcId(n) {
    if (!n) return "";
    if (n.dc) return n.dc;
    const labels = n.labels || {};
    return labels["maip.io/datacenter"] || "";
  }

  function hasNodeDc(n) {
    return Boolean(nodeDcId(n));
  }

  /** 写入节点数据中心字段与 maip.io/datacenter 标签 */
  function applyNodeDatacenter(n, dcId) {
    if (!n) return;
    const id = (dcId || "").trim();
    const labels = nodeLabelsOf(n);
    if (id) {
      n.dc = id;
      labels["maip.io/datacenter"] = id;
    } else {
      n.dc = "";
      delete labels["maip.io/datacenter"];
    }
    n.labels = labels;
  }

  function nowMaintTime() {
    return "2026-07-27 " + new Date().toTimeString().slice(0, 8);
  }

  /** 写入节点维护记录（隔离 / 入池 / 数据中心 / 标签 / 污点 等） */
  function recordNodeMaintOp({ action, node, remark, result = "success", time, operator }) {
    if (!node) return;
    if (!MOCK.faultOps) MOCK.faultOps = [];
    MOCK.faultOps.unshift({
      id: `MR-${9000 + MOCK.faultOps.length + 1}`,
      time: time || nowMaintTime(),
      action,
      node,
      operator: operator || MOCK.user?.name || "当前用户",
      remark: remark || "",
      result,
    });
  }

  function clipMaintRemark(text, max = 200) {
    const s = String(text || "");
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  }

  function formatDcLabel(dcId) {
    if (!dcId) return "未分配";
    const name = dcName(dcId);
    return name && name !== dcId ? `${name}（${dcId}）` : dcId;
  }

  function formatDcChangeRemark(prevId, nextId) {
    return `数据中心 ${formatDcLabel(prevId)} → ${formatDcLabel(nextId)}`;
  }

  function labelsEqual(a, b) {
    const ak = Object.keys(a || {}).sort();
    const bk = Object.keys(b || {}).sort();
    if (ak.length !== bk.length) return false;
    return ak.every((k, i) => k === bk[i] && String((a || {})[k] ?? "") === String((b || {})[k] ?? ""));
  }

  function summarizeLabelChange(prev, next, mode) {
    if (mode === "merge") {
      const parts = Object.entries(next || {}).map(([k, v]) => `${k}=${v}`);
      return clipMaintRemark(parts.length ? `合并写入标签：${parts.join(", ")}` : "合并写入标签");
    }
    const prevObj = prev || {};
    const nextObj = next || {};
    const added = [];
    const changed = [];
    const removed = [];
    Object.keys(nextObj).forEach((k) => {
      if (!(k in prevObj)) added.push(`${k}=${nextObj[k]}`);
      else if (String(prevObj[k] ?? "") !== String(nextObj[k] ?? "")) {
        changed.push(`${k}: ${prevObj[k]} → ${nextObj[k]}`);
      }
    });
    Object.keys(prevObj).forEach((k) => {
      if (!(k in nextObj)) removed.push(`${k}=${prevObj[k]}`);
    });
    const segs = [];
    if (added.length) segs.push(`新增 ${added.join(", ")}`);
    if (changed.length) segs.push(`修改 ${changed.join(", ")}`);
    if (removed.length) segs.push(`删除 ${removed.join(", ")}`);
    return clipMaintRemark(segs.length ? segs.join("；") : "标签无变更");
  }

  function taintSig(t) {
    return `${t.key}${t.value ? "=" + t.value : ""}:${t.effect || "NoSchedule"}`;
  }

  function taintsEqual(a, b) {
    const as = (a || []).map(taintSig).sort();
    const bs = (b || []).map(taintSig).sort();
    return as.length === bs.length && as.every((x, i) => x === bs[i]);
  }

  function summarizeTaintChange(prev, next, mode) {
    if (mode === "merge") {
      const parts = (next || []).map(taintSig);
      return clipMaintRemark(parts.length ? `合并写入污点：${parts.join(", ")}` : "合并写入污点");
    }
    const prevSet = new Set((prev || []).map(taintSig));
    const nextSet = new Set((next || []).map(taintSig));
    const added = [...nextSet].filter((x) => !prevSet.has(x));
    const removed = [...prevSet].filter((x) => !nextSet.has(x));
    const segs = [];
    if (added.length) segs.push(`新增 ${added.join(", ")}`);
    if (removed.length) segs.push(`删除 ${removed.join(", ")}`);
    return clipMaintRemark(segs.length ? segs.join("；") : "污点无变更");
  }

  /** 数据中心关联资源统计（节点 / 队列 / 集群） */
  function dcUsageStats(dcId) {
    const nodes = (MOCK.nodes || []).filter((n) => nodeDcId(n) === dcId).length;
    const queues = (MOCK.queues || []).filter((q) => q.dc === dcId).length;
    const clusters = (MOCK.clusters || []).filter((c) => (c.dcs || []).includes(dcId)).length;
    return { nodes, queues, clusters, total: nodes + queues + clusters };
  }

  function dcUsageActiveBits(usage) {
    const bits = [];
    if (usage.nodes) bits.push(`${usage.nodes} 节点`);
    if (usage.queues) bits.push(`${usage.queues} 队列`);
    if (usage.clusters) bits.push(`${usage.clusters} 集群`);
    return bits;
  }

  function dcDeleteBlockedHint(usage) {
    const bits = dcUsageActiveBits(usage);
    const steps = [];
    if (usage.nodes) steps.push("解除节点的数据中心标记");
    if (usage.queues) steps.push("删除或改挂队列");
    if (usage.clusters) steps.push("从集群覆盖中移除");
    return `当前关联 ${bits.join("、") || "相关资源"}。请先${steps.join("，") || "解除关联"}后再删除。`;
  }

  function buildDcLabel(labelKey, id) {
    const key = (labelKey || "maip.io/datacenter").trim() || "maip.io/datacenter";
    const val = (id || "").trim();
    return val ? `${key}=${val}` : `${key}=`;
  }

  function findQueue(idOrName) {
    if (!idOrName) return null;
    return (MOCK.queues || []).find((q) => q.id === idOrName || q.name === idOrName) || null;
  }

  function findTeam(id) {
    return (MOCK.teams || []).find((p) => p.id === id) || null;
  }

  /** 用户当前有效团队（忽略已删除的 teamId） */
  function userTeamIdsOf(u) {
    return (u?.teamIds || []).filter((id) => !!findTeam(id));
  }

  function findCluster(idOrName) {
    if (!idOrName) return null;
    return (MOCK.clusters || []).find((c) => c.id === idOrName || c.name === idOrName) || null;
  }

  /** 默认集群：取列表第一项（集群对等，无主/次角色） */
  function defaultCluster() {
    return (MOCK.clusters || [])[0] || null;
  }

  function clusterName(idOrName) {
    const c = findCluster(idOrName);
    return c?.displayName || c?.name || idOrName || "—";
  }

  /** 由显示名称生成内部 name / id（页面不再暴露集群标识） */
  function makeClusterKeys(displayName) {
    const slug = String(displayName || "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const base = slug || `cluster-${Date.now().toString(36)}`;
    const used = new Set(
      (MOCK.clusters || []).flatMap((c) => [c.id, c.name, c.name ? `cls-${c.name}` : ""].filter(Boolean))
    );
    let name = base;
    let n = 2;
    while (used.has(name) || used.has(`cls-${name}`)) {
      name = `${base}-${n++}`;
    }
    return { name, id: `cls-${name}` };
  }

  /** 当前选中的集群 id（右上角选择器） */
  function getCurrentClusterId() {
    if (currentClusterId && findCluster(currentClusterId)) return currentClusterId;
    const def = defaultCluster();
    currentClusterId = def?.id || (MOCK.clusters || [])[0]?.id || null;
    return currentClusterId;
  }

  /** 集群展示名（下拉 / 确认弹窗）：只显示名称，不暴露内部英文标识 */
  function clusterSelectLabel(id) {
    return clusterName(id);
  }

  /** 当前页面是否依赖「工作集群」作用域（平台中心 / 集群管理 / 数据中心 / 配置管理为跨集群或全局） */
  function pageUsesWorkspaceCluster(page) {
    const p = page || getActivePageId();
    return ![
      "cluster-mgmt",
      "dc-mgmt",
      "configs",
      "config-edit",
      "config-detail",
      "user-mgmt",
      "team-mgmt",
      "role-mgmt",
      "system-config",
      "platform",
    ].includes(p);
  }

  function getActivePageId() {
    const active = $(".page.active");
    if (!active?.id) return "";
    return active.id.replace(/^page-/, "");
  }

  function clusterStatusTone(status) {
    const s = String(status || "").toLowerCase();
    if (s === "healthy" || s === "ready") return "ok";
    if (s === "degraded" || s === "warning") return "warn";
    if (s === "unhealthy" || s === "down" || s === "failed") return "danger";
    return "ok";
  }

  /** 同步顶栏工作集群选择器与状态点 */
  function updateWorkspaceContext(opts = {}) {
    const c = findCluster(getCurrentClusterId());
    const page = opts.page || getActivePageId();
    const showWorkspace = pageUsesWorkspaceCluster(page);

    const wrap = $("#cluster-select-wrap");
    if (wrap) {
      wrap.classList.toggle("hidden", !showWorkspace);
      wrap.setAttribute("aria-hidden", showWorkspace ? "false" : "true");
    }

    const dot = $("#cluster-select-dot");
    if (dot) {
      const tone = clusterStatusTone(c?.status);
      dot.classList.toggle("is-warn", tone === "warn");
      dot.classList.toggle("is-danger", tone === "danger");
      dot.title = c?.status ? `集群状态：${c.status}` : "集群状态";
    }
  }

  /** 设置当前集群并同步右上角选择器；可选触发依赖页刷新（程序化调用，不弹确认） */
  function setCurrentClusterId(id, opts = {}) {
    const c = findCluster(id);
    if (!c) return false;
    const prev = currentClusterId;
    currentClusterId = c.id;
    const sel = $("#cluster-select");
    if (sel && sel.value !== c.id) sel.value = c.id;
    if (prev !== c.id) {
      nodeMgmtSelected = new Set();
      nodeMgmtFilter.page = 1;
    }
    updateWorkspaceContext();
    if (opts.refresh !== false && prev !== c.id) {
      refreshWorkspaceScopedPage();
    }
    return true;
  }

  /** 刷新当前激活的、依赖工作集群的页面 */
  function refreshWorkspaceScopedPage() {
    const page = getActivePageId();
    if (!pageUsesWorkspaceCluster(page)) return;
    if (page === "dashboard") renderDashboard();
    if (page === "node-mgmt") renderNodeMgmt();
    if (page === "queue-mgmt") renderQueueMgmt();
    if (page === "alerts") renderAlerts();
    if (page === "jobs") renderJobs();
    if (page === "my-queues") renderMyQueues();
    if (page === "job-create") renderJobCreate();
    if (page === "job-detail") renderJobDetail();
  }

  /** 右上角切换集群：待确认的目标集群 id */
  let pendingClusterSwitchId = null;

  function openClusterSwitchConfirm(targetId) {
    const fromId = getCurrentClusterId();
    const sel = $("#cluster-select");
    // 先还原选择器，待确认后再真正切换
    if (sel) sel.value = fromId || "";

    if (!targetId || targetId === fromId) return;
    if (!findCluster(targetId)) {
      toast("目标集群不存在", "error");
      return;
    }
    pendingClusterSwitchId = targetId;
    const fromEl = $("#modal-cluster-switch-from");
    const toEl = $("#modal-cluster-switch-to");
    const metaEl = $("#modal-cluster-switch-meta");
    if (fromEl) fromEl.textContent = clusterSelectLabel(fromId);
    if (toEl) toEl.textContent = clusterSelectLabel(targetId);
    if (metaEl) {
      metaEl.textContent = "";
      metaEl.classList.add("hidden");
    }
    $("#modal-cluster-switch")?.classList.add("show");
  }

  function closeClusterSwitchConfirm() {
    pendingClusterSwitchId = null;
    const sel = $("#cluster-select");
    if (sel) sel.value = getCurrentClusterId() || "";
    $("#modal-cluster-switch")?.classList.remove("show");
  }

  function confirmClusterSwitch() {
    const id = pendingClusterSwitchId;
    if (!id) {
      closeClusterSwitchConfirm();
      return;
    }
    pendingClusterSwitchId = null;
    $("#modal-cluster-switch")?.classList.remove("show");
    if (setCurrentClusterId(id, { refresh: true })) {
      const label = clusterSelectLabel(id);
      toast(`已切换工作集群：${label} · 页面数据已刷新`, "success");
    } else {
      toast("切换工作集群失败", "error");
      const sel = $("#cluster-select");
      if (sel) sel.value = getCurrentClusterId() || "";
    }
  }

  /** 用 MOCK.clusters 填充右上角集群下拉 */
  function initClusterSelect() {
    const sel = $("#cluster-select");
    if (!sel) return;
    const clusters = MOCK.clusters || [];
    const cur = getCurrentClusterId();
    sel.innerHTML = clusters
      .map((c) => {
        const label = clusterSelectLabel(c.id);
        return `<option value="${escapeHtml(c.id)}" ${c.id === cur ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
    if (cur) sel.value = cur;
    updateWorkspaceContext();
  }

  /** 当前集群下的节点 */
  function nodesOfCurrentCluster() {
    const cid = getCurrentClusterId();
    if (!cid) return [...(MOCK.nodes || [])];
    return (MOCK.nodes || []).filter((n) => (n.clusterId || "cls-primary") === cid);
  }

  function findNode(name) {
    return (MOCK.nodes || []).find((n) => n.name === name) || null;
  }

  /** 节点 Labels：优先显式 labels，否则按字段推导 */
  function nodeLabelsOf(n) {
    if (n.labels && typeof n.labels === "object") return { ...n.labels };
    const labels = {
      "kubernetes.io/hostname": n.name,
      "node-role.kubernetes.io/worker": "",
    };
    if (n.dc) labels["maip.io/datacenter"] = n.dc;
    if (n.ibDomain && n.ibDomain !== "-") labels["maip.io/ib-domain"] = n.ibDomain;
    if (n.gpuType) labels["maip.io/gpu-type"] = n.gpuType;
    if (n.hasIB === false) labels["maip.io/ib"] = "false";
    return labels;
  }

  function nodeTaintsOf(n) {
    if (Array.isArray(n.taints)) return n.taints.map((t) => ({ ...t }));
    return [];
  }

  /**
   * Kubernetes Label / Taint 字段校验
   * 对齐 k8s.io/apimachinery/pkg/util/validation：
   * - key：可选 DNS1123 前缀（≤253）+ '/' + 名称（≤63）
   * - value：可空，非空时规则同名称（≤63）
   * - taint effect：NoSchedule | PreferNoSchedule | NoExecute
   */
  const K8S_QNAME_NAME_MAX = 63;
  const K8S_DNS1123_SUBDOMAIN_MAX = 253;
  const K8S_QNAME_PREFIX_MAX = K8S_DNS1123_SUBDOMAIN_MAX;
  const K8S_LABEL_VALUE_MAX = 63;
  const K8S_QNAME_KEY_MAX = K8S_QNAME_PREFIX_MAX + 1 + K8S_QNAME_NAME_MAX;
  const K8S_QNAME_NAME_RE = /^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/;
  const K8S_DNS1123_SUBDOMAIN_RE =
    /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  const K8S_TAINT_EFFECTS = ["NoSchedule", "PreferNoSchedule", "NoExecute"];

  function k8sQualifiedNameError(name, fieldLabel) {
    const raw = name == null ? "" : String(name);
    if (!raw) return `${fieldLabel} 不能为空`;
    const parts = raw.split("/");
    if (parts.length > 2) {
      return `${fieldLabel} 最多包含一个 '/'，格式为 [前缀/]名称，例如 app 或 example.com/app`;
    }
    let namePart = raw;
    if (parts.length === 2) {
      const prefix = parts[0];
      namePart = parts[1];
      if (!prefix) return `${fieldLabel} 的前缀不能为空`;
      if (prefix.length > K8S_QNAME_PREFIX_MAX) {
        return `${fieldLabel} 的前缀不能超过 ${K8S_QNAME_PREFIX_MAX} 个字符`;
      }
      if (!K8S_DNS1123_SUBDOMAIN_RE.test(prefix)) {
        return `${fieldLabel} 的前缀须为小写 DNS 子域名（小写字母、数字、'-'、'.'，且以字母或数字开头结尾）`;
      }
    }
    if (!namePart) return `${fieldLabel} 的名称部分不能为空`;
    if (namePart.length > K8S_QNAME_NAME_MAX) {
      return `${fieldLabel} 的名称部分不能超过 ${K8S_QNAME_NAME_MAX} 个字符`;
    }
    if (!K8S_QNAME_NAME_RE.test(namePart)) {
      return `${fieldLabel} 的名称须由字母、数字、'-'、'_'、'.' 组成，且以字母或数字开头结尾`;
    }
    return "";
  }

  function k8sLabelValueError(value, fieldLabel) {
    const raw = value == null ? "" : String(value);
    if (!raw) return "";
    if (raw.length > K8S_LABEL_VALUE_MAX) {
      return `${fieldLabel} 不能超过 ${K8S_LABEL_VALUE_MAX} 个字符`;
    }
    if (!K8S_QNAME_NAME_RE.test(raw)) {
      return `${fieldLabel} 须由字母、数字、'-'、'_'、'.' 组成，且以字母或数字开头结尾，或为空`;
    }
    return "";
  }

  function k8sTaintEffectError(effect) {
    if (!effect) return "污点 effect 不能为空";
    if (!K8S_TAINT_EFFECTS.includes(effect)) {
      return `污点 effect 仅支持 ${K8S_TAINT_EFFECTS.join("、")}`;
    }
    return "";
  }

  /**
   * Kubernetes 资源名（metadata.name）校验
   * 对齐 IsDNS1123Subdomain：RFC 1123 DNS 子域名，最长 253
   */
  function k8sDns1123SubdomainError(name, fieldLabel) {
    const raw = name == null ? "" : String(name);
    if (!raw) return `${fieldLabel} 不能为空`;
    if (raw.length > K8S_DNS1123_SUBDOMAIN_MAX) {
      return `${fieldLabel} 不能超过 ${K8S_DNS1123_SUBDOMAIN_MAX} 个字符`;
    }
    if (!K8S_DNS1123_SUBDOMAIN_RE.test(raw)) {
      return `${fieldLabel} 须符合 Kubernetes RFC 1123 命名规范：小写字母、数字、'-'、'.'，且以字母或数字开头结尾`;
    }
    return "";
  }

  function setQueueNameFieldError(message) {
    const el = $("#q-form-name");
    const inline = $("#q-form-name-error");
    setInputInvalid(el, !!message);
    if (inline) {
      inline.textContent = message || "";
      inline.hidden = !message;
    }
  }

  function setInputInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle("is-invalid", !!invalid);
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function setNodeEditorError(errEl, message) {
    if (!errEl) return;
    if (message) {
      errEl.textContent = message;
      errEl.style.display = "";
    } else {
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  }

  function clearNodeFieldInvalid(el, errSel) {
    if (!el) return;
    setInputInvalid(el, false);
    const err = $(errSel);
    const modal = el.closest(".modal");
    if (err && modal && !modal.querySelector(".is-invalid")) {
      setNodeEditorError(err, "");
    }
  }

  function clearNodeEditorInvalid(modalSel, errSel) {
    $$(`${modalSel} .is-invalid`).forEach((el) => setInputInvalid(el, false));
    setNodeEditorError($(errSel), "");
  }

  /** 统计任务 mock 中落在该节点上的 Pod 数 */
  function countJobPodsOnNode(nodeName) {
    if (!nodeName) return 0;
    let count = 0;
    (MOCK.jobs || []).forEach((j) => {
      (j.pods || []).forEach((p) => {
        if (p && p.node === nodeName) count += 1;
      });
    });
    return count;
  }

  /**
   * 节点 Pod 占用：当前数 / 容量（如 25/120）
   * 优先读节点字段 podCount / pods（number）/ podCapacity；
   * 缺失时按「任务 Pod + 系统组件基线」推导，避免缓存旧数据时全是 0/110。
   */
  function nodePodsOf(n) {
    if (!n) return { used: 0, capacity: 110 };
    const capacity = Number(n.podCapacity) > 0 ? Number(n.podCapacity) : 110;

    let used = null;
    if (typeof n.podCount === "number" && Number.isFinite(n.podCount)) {
      used = n.podCount;
    } else if (typeof n.pods === "number" && Number.isFinite(n.pods)) {
      used = n.pods;
    } else if (n.pods && typeof n.pods === "object" && !Array.isArray(n.pods)) {
      const raw = Number(n.pods.used ?? n.pods.current);
      if (Number.isFinite(raw)) used = raw;
    }

    if (used == null) {
      // 系统 / DaemonSet 基线 + 任务 Pod
      let base = 8;
      if (n.status === "NotReady") base = 2;
      else if (n.isolateState === "isolated" || n.status === "SchedulingDisabled") base = 5;
      else if (n.jobs && n.jobs !== "-") base = 12;
      used = base + countJobPodsOnNode(n.name);
    }

    used = Math.max(0, Math.min(capacity, Math.floor(used)));
    return { used, capacity };
  }

  /** 列表单元格：25/120 */
  function renderNodePodsCell(n) {
    const { used, capacity } = nodePodsOf(n);
    const ratio = capacity > 0 ? used / capacity : 0;
    let cls = "node-pods-cell";
    if (n?.status === "NotReady") cls += " is-unknown";
    else if (ratio >= 0.85) cls += " is-high";
    else if (ratio >= 0.6) cls += " is-mid";
    return `<span class="${cls}" title="Pods 当前 / 容量（当前 ${used}，容量 ${capacity}）"><span class="node-pods-used">${used}</span><span class="node-pods-sep">/</span><span class="node-pods-cap">${capacity}</span></span>`;
  }

  /** 解析节点 CPU/内存用量百分比（"78%" | 78 | "-" | 空） */
  function parseNodeUsagePct(val) {
    if (val == null || val === "" || val === "-") return null;
    if (typeof val === "number" && Number.isFinite(val)) {
      return Math.max(0, Math.min(100, Math.round(val)));
    }
    const m = String(val).trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
    if (!m) return null;
    return Math.max(0, Math.min(100, Math.round(parseFloat(m[1]))));
  }

  /**
   * 节点 CPU 用量：used/total 核
   * 优先 cpuUsed + cpuTotal；否则由 cpu 百分比 × 默认容量 128 核推算
   */
  function nodeCpuUsageOf(n) {
    if (!n) return { used: null, total: 128, pct: null, unit: "核" };
    const total =
      Number(n.cpuTotal) > 0 ? Math.round(Number(n.cpuTotal)) : 128;
    let used = null;
    if (typeof n.cpuUsed === "number" && Number.isFinite(n.cpuUsed)) {
      used = Math.max(0, Math.round(n.cpuUsed));
    } else {
      const pct = parseNodeUsagePct(n.cpu);
      if (pct != null) used = Math.round((pct / 100) * total);
    }
    if (used == null) return { used: null, total, pct: null, unit: "核" };
    used = Math.max(0, Math.min(total, used));
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return { used, total, pct, unit: "核" };
  }

  /**
   * 节点内存用量：used/total Gi
   * 优先 memUsedGi + memTotalGi；否则由 mem 百分比 × 默认容量 1024 Gi 推算
   */
  function nodeMemUsageOf(n) {
    if (!n) return { used: null, total: 1024, pct: null, unit: "Gi" };
    const total =
      Number(n.memTotalGi) > 0 ? Math.round(Number(n.memTotalGi)) : 1024;
    let used = null;
    if (typeof n.memUsedGi === "number" && Number.isFinite(n.memUsedGi)) {
      used = Math.max(0, Math.round(n.memUsedGi));
    } else {
      const pct = parseNodeUsagePct(n.mem);
      if (pct != null) used = Math.round((pct / 100) * total);
    }
    if (used == null) return { used: null, total, pct: null, unit: "Gi" };
    used = Math.max(0, Math.min(total, used));
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return { used, total, pct, unit: "Gi" };
  }

  /**
   * 用量占比单元格：准确 used/total（可带单位）+ 进度条
   * @param {{ used: number|null, total: number, pct: number|null, unit?: string }} info
   */
  function renderNodeRatioCell(info, opts = {}) {
    const label = opts.label || "用量";
    const unit = info?.unit || opts.unit || "";
    const used = info?.used;
    const total = info?.total;
    const pct = info?.pct;
    if (used == null || total == null || !total || pct == null) {
      return `<div class="node-usage-cell is-unknown" title="${escapeHtml(label)} 未知">
        <span class="node-usage-pct text-muted">—</span>
        <div class="progress node-usage-bar"><div class="progress-bar" style="width:0%"></div></div>
      </div>`;
    }
    const barCls = opts.unknown ? "" : quotaBarClass(pct);
    const unitHint = unit ? ` ${unit}` : "";
    const title = `${label} ${used}/${total}${unitHint}（${pct}%）`;
    return `<div class="node-usage-cell${opts.unknown ? " is-unknown" : ""}" title="${escapeHtml(title)}">
      <span class="node-usage-pct node-usage-frac">
        <span class="node-pods-used">${used}</span><span class="node-pods-sep">/</span><span class="node-pods-cap">${total}</span>${
          unit
            ? `<span class="node-usage-unit">${escapeHtml(unit)}</span>`
            : ""
        }
      </span>
      <div class="progress node-usage-bar"><div class="progress-bar ${barCls}" style="width:${pct}%"></div></div>
    </div>`;
  }

  /** @deprecated 兼容旧调用：仅百分比时请改用 renderNodeRatioCell */
  function renderNodeUsageCell(pct, opts = {}) {
    if (pct == null || Number.isNaN(pct)) {
      return renderNodeRatioCell({ used: null, total: 0, pct: null }, opts);
    }
    // 无准确容量时退化为 百分数/100 展示
    return renderNodeRatioCell(
      { used: pct, total: 100, pct, unit: "%" },
      { ...opts, label: opts.label || "用量" }
    );
  }

  /**
   * GPU 槽位约定（原型）：0=空闲 · 1=占用 · 3=故障/不可用
   * 返回 used/total/fault 与占用百分比
   */
  function nodeGpuUsageOf(n) {
    if (!n) return { used: 0, total: 0, fault: 0, pct: null };
    const slots = Array.isArray(n.gpus) ? n.gpus : [];
    const total = slots.length;
    if (!total) return { used: 0, total: 0, fault: 0, pct: null };
    const used = slots.filter((s) => s === 1).length;
    const fault = slots.filter((s) => s === 3).length;
    const pct = Math.round((used / total) * 100);
    return { used, total, fault, pct };
  }

  /** GPU 用量：8/8 + 进度条 */
  function renderNodeGpuUsageCell(n) {
    const { used, total, fault, pct } = nodeGpuUsageOf(n);
    if (!total || pct == null) {
      return renderNodeRatioCell({ used: null, total: 0, pct: null }, { label: "GPU" });
    }
    const titleExtra = fault ? ` · ${fault} 卡故障/不可用` : "";
    const cell = renderNodeRatioCell(
      { used, total, pct },
      { label: "GPU", unknown: n?.status === "NotReady" }
    );
    // 附加故障信息到 title（replace outer title）
    return cell.replace(
      /title="[^"]*"/,
      `title="${escapeHtml(`GPU ${used}/${total} 占用${titleExtra}（${pct}%）`)}"`
    );
  }

  function renderNodeCpuUsageCell(n) {
    return renderNodeRatioCell(nodeCpuUsageOf(n), {
      label: "CPU",
      unknown: n?.status === "NotReady",
    });
  }

  function renderNodeMemUsageCell(n) {
    return renderNodeRatioCell(nodeMemUsageOf(n), {
      label: "内存",
      unknown: n?.status === "NotReady",
    });
  }

  function renderNodeCpuMemDetail(n) {
    return `<div class="node-usage-detail">
      <div class="node-usage-detail-row">
        <span class="node-usage-detail-label">CPU</span>
        ${renderNodeCpuUsageCell(n)}
      </div>
      <div class="node-usage-detail-row">
        <span class="node-usage-detail-label">内存</span>
        ${renderNodeMemUsageCell(n)}
      </div>
      <div class="node-usage-detail-row">
        <span class="node-usage-detail-label">GPU</span>
        ${renderNodeGpuUsageCell(n)}
      </div>
    </div>`;
  }

  function renderK8sLabels(labels, opts = {}) {
    const max = opts.max ?? 6;
    const entries = Object.entries(labels || {});
    if (!entries.length) return `<span class="text-muted">—</span>`;
    const show = entries.slice(0, max);
    const more = entries.length - show.length;
    const tags = show
      .map(
        ([k, v]) =>
          `<span class="k8s-label-tag" title="${escapeHtml(k)}=${escapeHtml(v ?? "")}"><span class="k8s-label-key">${escapeHtml(k)}</span>${
            v === "" || v == null ? "" : `<span class="k8s-label-eq">=</span><span class="k8s-label-val">${escapeHtml(String(v))}</span>`
          }</span>`
      )
      .join("");
    return `<div class="k8s-label-list">${tags}${
      more > 0 ? `<span class="text-muted" style="font-size:11px">+${more}</span>` : ""
    }</div>`;
  }

  function renderK8sTaints(taints, opts = {}) {
    const list = taints || [];
    if (!list.length) return `<span class="text-muted">无污点</span>`;
    const max = opts.max ?? 3;
    const show = list.slice(0, max);
    const more = list.length - show.length;
    const tags = show
      .map((t) => {
        const text = t.value ? `${t.key}=${t.value}:${t.effect}` : `${t.key}:${t.effect}`;
        return `<span class="k8s-taint-tag" title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
      })
      .join("");
    return `<div class="k8s-taint-list">${tags}${
      more > 0 ? `<span class="text-muted" style="font-size:11px">+${more}</span>` : ""
    }</div>`;
  }

  function clusterStatusBadge(status) {
    const map = {
      Healthy: { label: "健康", cls: "badge-healthy" },
      Degraded: { label: "降级", cls: "badge-warning" },
      Offline: { label: "离线", cls: "badge-danger" },
    };
    const m = map[status] || { label: status || "—", cls: "badge-info" };
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  }

  /** kubelet 标准 Node Condition，顺序与 kubectl get node -o yaml 一致 */
  const K8S_NODE_CONDITION_TYPES = [
    "MemoryPressure",
    "DiskPressure",
    "PIDPressure",
    "Ready",
    "NetworkUnavailable",
  ];

  const K8S_NODE_CONDITION_TEXT = {
    MemoryPressure: {
      false: ["KubeletHasSufficientMemory", "kubelet has sufficient memory available"],
      true: ["KubeletHasInsufficientMemory", "kubelet has insufficient memory available"],
    },
    DiskPressure: {
      false: ["KubeletHasNoDiskPressure", "kubelet has no disk pressure"],
      true: ["KubeletHasDiskPressure", "kubelet has disk pressure"],
    },
    PIDPressure: {
      false: ["KubeletHasSufficientPID", "kubelet has sufficient PID available"],
      true: ["KubeletHasInsufficientPID", "kubelet has insufficient PID available"],
    },
    Ready: {
      true: ["KubeletReady", "kubelet is posting ready status"],
      false: ["KubeletNotReady", "kubelet is not ready"],
    },
    NetworkUnavailable: {
      false: ["RouteCreated", "Flannel is running correctly"],
      true: ["NoRouteCreated", "network plugin is not ready"],
    },
  };

  function parseNodeUsagePct(v) {
    if (v == null || v === "-" || v === "") return null;
    const m = String(v).match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  function nodeConditionFlags(n) {
    const explicit = (n && n.conditionFlags) || {};
    const notReady = !n || n.status === "NotReady";
    const memPct = parseNodeUsagePct(n?.mem);
    return {
      Ready: explicit.Ready != null ? !!explicit.Ready : !notReady,
      MemoryPressure: explicit.MemoryPressure != null ? !!explicit.MemoryPressure : memPct != null && memPct >= 92,
      DiskPressure: explicit.DiskPressure === true,
      PIDPressure: explicit.PIDPressure === true,
      NetworkUnavailable:
        explicit.NetworkUnavailable != null
          ? !!explicit.NetworkUnavailable
          : !!(n && (n.status === "NotReady" || n.ib === "down")),
    };
  }

  function nodeConditionsOf(n) {
    const flags = nodeConditionFlags(n);
    const now = "2026-07-27T14:32:18Z";
    return K8S_NODE_CONDITION_TYPES.map((type) => {
      const isTrue = !!flags[type];
      const [reason, message] = K8S_NODE_CONDITION_TEXT[type][isTrue ? "true" : "false"];
      return {
        type,
        status: isTrue ? "True" : "False",
        reason,
        message,
        lastHeartbeatTime: now,
        lastTransitionTime: now,
      };
    });
  }

  /** K8s 就绪态：仅 Ready / NotReady。SchedulingDisabled 属于调度态 */
  function k8sNodeReadyState(statusOrNode) {
    if (statusOrNode && typeof statusOrNode === "object") {
      return nodeConditionFlags(statusOrNode).Ready ? "Ready" : "NotReady";
    }
    return statusOrNode === "NotReady" ? "NotReady" : "Ready";
  }

  /**
   * 对齐 kubectl get node 的 STATUS 列：
   * Ready/NotReady + 为 True 的 Condition + 不可调度时的 SchedulingDisabled。
   */
  function k8sNodeKubectlStatus(n, opts = {}) {
    const conds = nodeConditionsOf(n);
    const ready = conds.find((c) => c.type === "Ready");
    const parts = [ready && ready.status === "True" ? "Ready" : "NotReady"];
    ["MemoryPressure", "DiskPressure", "PIDPressure", "NetworkUnavailable"].forEach((type) => {
      const c = conds.find((x) => x.type === type);
      if (c && c.status === "True") parts.push(type);
    });
    if (opts.includeCordon !== false && isNodeCordoned(n)) parts.push("SchedulingDisabled");
    return parts.join(",") || "Unknown";
  }

  function k8sNodeStatusBadge(nodeOrStatus) {
    const n = nodeOrStatus && typeof nodeOrStatus === "object" ? nodeOrStatus : { status: nodeOrStatus };
    const text = k8sNodeKubectlStatus(n);
    const ready = k8sNodeReadyState(n);
    const extra = text.includes(",");
    const cls = ready === "NotReady" ? "badge-danger" : extra ? "badge-warning" : "badge-healthy";
    return `<span class="badge ${cls} node-k8s-status" title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
  }

  function renderNodeConditionTags(n) {
    const conds = nodeConditionsOf(n);
    const ordered = [
      ...conds.filter((c) => c.type === "Ready"),
      ...conds.filter((c) => c.type !== "Ready"),
    ];
    return ordered
      .map((c) => {
        const on = c.status === "True";
        const warn = on && c.type !== "Ready";
        const ok = on && c.type === "Ready";
        const cls = warn ? "badge-warning" : ok ? "badge-healthy" : "badge-info";
        return `<span class="badge ${cls}" title="${escapeHtml(c.reason)}: ${escapeHtml(c.message)}">${escapeHtml(
          c.type
        )}=${c.status}</span>`;
      })
      .join(" ");
  }

  /** 是否平台管理员（本地管理员登录） */
  function isPlatformAdmin() {
    return !!(MOCK.user?.isAdmin || MOCK.user?.method === "admin");
  }

  /** 当前登录用户可访问的团队（成员包含自己；「我的队列」等用户视角） */
  function teamsForCurrentUser() {
    const name = MOCK.user?.name;
    return (MOCK.teams || []).filter(
      (p) => p.status !== "archived" && (p.members || []).includes(name)
    );
  }

  /**
   * 创建训练任务可选团队：
   * - 平台管理员：全部未归档团队（拥有全部权限）
   * - 普通用户：仅自己加入的团队
   */
  function teamsForJobCreate() {
    if (isPlatformAdmin()) {
      return (MOCK.teams || []).filter(
        (p) => p.status !== "archived" && p.status !== "disabled"
      );
    }
    return teamsForCurrentUser();
  }

  function isQueueEnabled(q) {
    if (!q) return false;
    const s = String(q.state || "Open");
    return s !== "Closed" && s !== "Disabled" && s !== "disabled";
  }

  function queueStateBadge(q) {
    return isQueueEnabled(q)
      ? '<span class="badge badge-healthy">启用</span>'
      : '<span class="badge badge-cancelled">禁用</span>';
  }

  /**
   * 团队关联队列（创建任务）
   * - 平台管理员：该团队全部关联队列（含禁用，便于查看；禁用项在文案中标注）
   * - 普通用户：仅已启用队列
   */
  function queuesForTeam(teamId, opts = {}) {
    const p = findTeam(teamId);
    if (!p) return [];
    const forAdmin = opts.forAdmin != null ? opts.forAdmin : isPlatformAdmin();
    return (p.queueIds || [])
      .map(findQueue)
      .filter((q) => {
        if (!q) return false;
        if (forAdmin) return true;
        return isQueueEnabled(q);
      });
  }

  /** 队列关联的团队 id（兼容旧字段 teamId，并与 team.queueIds 对齐） */
  function queueTeamIdsOf(q) {
    if (!q) return [];
    const fromField =
      Array.isArray(q.teamIds) && q.teamIds.length
        ? q.teamIds.filter(Boolean)
        : q.teamId
          ? [q.teamId]
          : [];
    const fromTeams = (MOCK.teams || [])
      .filter((t) => (t.queueIds || []).includes(q.id))
      .map((t) => t.id);
    return [...new Set([...fromField, ...fromTeams])];
  }

  function teamsOfQueue(q) {
    return queueTeamIdsOf(q).map(findTeam).filter(Boolean);
  }

  function queueTeamNames(q) {
    const names = teamsOfQueue(q).map((t) => t.name).filter(Boolean);
    if (names.length) return names;
    return q?.team ? String(q.team).split(/[、,，]/).map((s) => s.trim()).filter(Boolean) : [];
  }

  function applyQueueTeams(q, teamIds) {
    if (!q) return;
    const teams = [...new Set((teamIds || []).filter(Boolean))].map(findTeam).filter(Boolean);
    q.teamIds = teams.map((t) => t.id);
    q.teamId = teams[0]?.id || "";
    q.team = teams.map((t) => t.name).join("、");
  }

  /**
   * 当前用户可使用的全部队列（去重）
   * 附带关联团队名列表，便于「我的队列」页展示
   * 平台管理员：全量团队的关联队列
   */
  function queuesForCurrentUser() {
    const teams = isPlatformAdmin() ? teamsForJobCreate() : teamsForCurrentUser();
    const map = new Map();
    teams.forEach((t) => {
      (t.queueIds || []).forEach((qid) => {
        const q = findQueue(qid);
        if (!q) return;
        if (!map.has(q.id)) {
          map.set(q.id, { queue: q, teams: [] });
        }
        map.get(q.id).teams.push(t.name);
      });
    });
    return [...map.values()];
  }

  /** 用户侧队列：统计与该队列相关的活跃任务 */
  function jobsForQueue(queueIdOrName) {
    const q = findQueue(queueIdOrName);
    if (!q) return [];
    return (MOCK.jobs || []).filter(
      (j) => j.queueId === q.id || j.queue === q.name
    );
  }

  function activeJobsForQueue(queueIdOrName) {
    return jobsForQueue(queueIdOrName).filter((j) =>
      ["running", "starting", "queued"].includes(j.status)
    );
  }

  /** 队列运行中（含启动中）/ 排队中任务计数 */
  function queueActiveJobCounts(queueIdOrName) {
    const jobs = activeJobsForQueue(queueIdOrName);
    let running = 0;
    let queued = 0;
    jobs.forEach((j) => {
      if (j.status === "queued") queued += 1;
      else running += 1;
    });
    return { jobs, running, queued, total: jobs.length };
  }

  /** 解析任务时长文案为小时数：支持 "36h 12m" / "18m" / "2h" / "1d 4h" */
  function parseDurationToHours(duration) {
    if (!duration || duration === "-") return 0;
    const s = String(duration).toLowerCase();
    let hours = 0;
    const day = s.match(/(\d+(?:\.\d+)?)\s*d/);
    const hr = s.match(/(\d+(?:\.\d+)?)\s*h/);
    const min = s.match(/(\d+(?:\.\d+)?)\s*m/);
    if (day) hours += parseFloat(day[1]) * 24;
    if (hr) hours += parseFloat(hr[1]);
    if (min) hours += parseFloat(min[1]) / 60;
    return hours;
  }

  /**
   * 任务卡时 = GPU 数 × 运行小时。
   * 排队中不计；可被 job.gpuHours 显式覆盖。后续可用于任务成本核算。
   */
  function jobGpuHours(job) {
    if (!job) return 0;
    if (job.status === "queued") return 0;
    if (job.gpuHours != null && job.gpuHours !== "") {
      const n = Number(job.gpuHours);
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    }
    const gpus = Number(job.gpus) || 0;
    return Math.max(0, gpus * parseDurationToHours(job.duration));
  }

  const GPU_RES_DEFAULTS = {
    "H100-80G": { cpuPerGpu: 16, memGiPerGpu: 128 },
    "H200-141G": { cpuPerGpu: 16, memGiPerGpu: 160 },
    B300: { cpuPerGpu: 16, memGiPerGpu: 128 },
    "NVIDIA-GeForce-RTX-4090": { cpuPerGpu: 16, memGiPerGpu: 32 },
  };
  const GPU_RES_FALLBACK = { cpuPerGpu: 16, memGiPerGpu: 128 };

  function formatCreatedAtCell(ts) {
    const raw = String(ts || "").trim();
    if (!raw || raw === "-") return "—";
    const parts = raw.split(/\s+/);
    if (parts.length < 2) return escapeHtml(raw);
    return `<div>${escapeHtml(parts[0])}</div><div class="td-created-time">${escapeHtml(parts.slice(1).join(" "))}</div>`;
  }

  function formatGpuTypeHtml(name) {
    return escapeHtml(name || "—").replace(/-/g, "-<wbr>");
  }

  function gpuResSpecOf(gpuType) {
    return GPU_RES_DEFAULTS[gpuType] || GPU_RES_FALLBACK;
  }

  function formatMemGi(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) return "—";
    if (v >= 1024) {
      const ti = v / 1024;
      const s = ti % 1 === 0 ? String(ti) : ti.toFixed(1).replace(/\.0$/, "");
      return `${s} TiB`;
    }
    return `${Math.round(v)} GiB`;
  }

  function memUnitFor(values) {
    const max = Math.max(0, ...[...values].map((n) => Number(n) || 0));
    return max >= 1024 ? "TiB" : "GiB";
  }

  function formatMemAmount(n, unit) {
    const v = Number(n) || 0;
    if (unit === "TiB") {
      const ti = v / 1024;
      return ti % 1 === 0 ? String(ti) : ti.toFixed(1).replace(/\.0$/, "");
    }
    return String(Math.round(v));
  }

  function formatMemAmountWithUnit(n, unit) {
    return `${formatMemAmount(n, unit)} ${unit}`;
  }

  function jobResourcesFromSpec(gpus, gpuType, extra) {
    const count = Number(gpus) || 0;
    const spec = gpuResSpecOf(gpuType);
    const cpus = Number(extra?.cpus);
    const memGi = Number(extra?.memGi);
    return {
      gpus: count,
      gpuType: gpuType || "GPU",
      nodes: extra?.nodes,
      cpus: Number.isFinite(cpus) && cpus > 0 ? cpus : count * spec.cpuPerGpu,
      memGi: Number.isFinite(memGi) && memGi > 0 ? memGi : count * spec.memGiPerGpu,
    };
  }

  function jobResourcesOf(job) {
    return jobResourcesFromSpec(job?.gpus, job?.gpuType, job);
  }

  function renderJobResourceInline(job) {
    const r = jobResourcesOf(job);
    const gpn = typeof gpusPerNodeOf === "function" && job?.nodes ? gpusPerNodeOf(job) : null;
    const layout = [r.nodes != null ? `${r.nodes} 节点` : "", gpn ? `${gpn} GPU/节点` : ""]
      .filter(Boolean)
      .join(" · ");
    return `
      <span class="job-res-inline">
        ${layout ? `<span class="job-res-inline-line">${escapeHtml(layout)}</span>` : ""}
        <span class="job-res-inline-line">${r.gpus} × <span class="gpu-type-text">${formatGpuTypeHtml(r.gpuType)}</span></span>
        <span class="job-res-inline-line nowrap">CPU ${r.cpus} · ${formatMemGi(r.memGi)}</span>
      </span>`;
  }

  function jobResourceSummaryText(job) {
    const r = jobResourcesOf(job);
    const nodes = r.nodes != null ? `${r.nodes} 节点 · ` : "";
    return `${nodes}${r.gpus} × ${r.gpuType} · CPU ${r.cpus} · ${formatMemGi(r.memGi)}`;
  }

  function renderJobResourceCell(job, opts = {}) {
    const r = jobResourcesOf(job);
    const type = escapeHtml(r.gpuType);
    const extra = opts.extraSub || "";
    return `
      <div class="job-res">
        <div class="job-res-gpu" title="${r.gpus} × ${type}">
          <span class="job-res-gpu-count">${r.gpus}</span>
          <span class="job-res-gpu-mul" aria-hidden="true">×</span>
          <span class="job-res-gpu-type">${type}</span>
        </div>
        <div class="job-res-specs">
          <span class="job-res-spec"><em>节点</em><b>${r.nodes || "—"}</b></span>
          <span class="job-res-spec"><em>CPU</em><b>${r.cpus}</b></span>
          <span class="job-res-spec"><em>内存</em><b>${formatMemGi(r.memGi)}</b></span>
          ${extra}
        </div>
      </div>`;
  }

  function formatMemPair(used, total) {
    const u = Number(used) || 0;
    const t = Number(total) || 0;
    const toTi = (n) => {
      const ti = n / 1024;
      return ti % 1 === 0 ? String(ti) : ti.toFixed(1);
    };
    if (t >= 1024 || u >= 1024) return `${toTi(u)}/${toTi(t)}Ti`;
    return `${u}/${t}Gi`;
  }

  function formatGpuHours(n, opts = {}) {
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) return "—";
    const abs = v;
    let text;
    if (abs === 0) text = "0";
    else if (abs < 10) text = abs.toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    else if (abs < 100) text = abs.toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    else text = Math.round(abs).toLocaleString("zh-CN");
    return opts.unit === false ? text : `${text} 卡时`;
  }

  /** 队列本月累计卡时：优先用队列聚合字段，否则按关联任务汇总 */
  function queueGpuHoursMonth(q) {
    if (!q) return 0;
    if (q.gpuHoursMonth != null && q.gpuHoursMonth !== "") {
      const n = Number(q.gpuHoursMonth);
      if (Number.isFinite(n)) return Math.max(0, n);
    }
    return jobsForQueue(q.id).reduce((s, j) => s + jobGpuHours(j), 0);
  }

  function queueGpuFree(q) {
    if (!q) return 0;
    return Math.max(0, (q.gpuQuota || 0) - (q.gpuUsed || 0));
  }

  function queueUtilPct(q) {
    if (!q || !q.gpuQuota) return 0;
    return Math.min(100, Math.round(((q.gpuUsed || 0) / q.gpuQuota) * 100));
  }

  function quotaBarClass(pct) {
    if (pct >= 90) return "danger";
    if (pct >= 75) return "warn";
    return "success";
  }

  function renderQueueQuotaMini(label, used, total, opts = {}) {
    const u = Number(used) || 0;
    const t = Number(total) || 0;
    const free = Math.max(0, t - u);
    const pct = t > 0 ? Math.min(100, Math.round((u / t) * 100)) : 0;
    const fmt = typeof opts.format === "function" ? opts.format : (n) => String(n);
    const unit = opts.unit ? ` ${opts.unit}` : "";
    return `
      <div class="queue-quota-mini">
        <div class="queue-quota-mini-label">
          <span>${escapeHtml(label)}</span>
          <span class="mono">${fmt(u)}/${fmt(t)}${unit} · 余 <strong class="${free ? "text-success" : "text-danger"}">${fmt(free)}</strong></span>
        </div>
        <div class="progress queue-quota-mini-bar"><div class="progress-bar ${quotaBarClass(pct)}" style="width:${pct}%"></div></div>
      </div>`;
  }

  function renderQueueQuotaMeters(q) {
    const memUsed = q?.memUsedGi || 0;
    const memTotal = q?.memQuotaGi || 0;
    const memFree = Math.max(0, memTotal - memUsed);
    const memUnit = memUnitFor([memUsed, memTotal, memFree]);
    return `<div class="queue-quota-mini-list">
      ${renderQueueQuotaMini("GPU", q?.gpuUsed, q?.gpuQuota, { unit: "卡" })}
      ${renderQueueQuotaMini("CPU", q?.cpuUsed, q?.cpuQuota, { unit: "核" })}
      ${renderQueueQuotaMini("内存", memUsed, memTotal, {
        format: (n) => formatMemAmount(n, memUnit),
        unit: memUnit,
      })}
    </div>`;
  }

  function renderAllocMeter({ label, total, allocated, formatValue, unit }) {
    const t = Number(total) || 0;
    const a = Number(allocated) || 0;
    const remain = Math.max(0, t - a);
    const pct = t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0;
    const tone = quotaBarClass(pct);
    const pctColor =
      tone === "danger" ? "text-danger" : tone === "warn" ? "text-warning" : "text-success";
    const fmt =
      typeof formatValue === "function"
        ? formatValue
        : (n) => `${n}${unit ? ` ${unit}` : ""}`;
    return `
      <div class="queue-capacity-meter">
        <div class="queue-capacity-bar-label">
          <span>${escapeHtml(label)}</span>
          <span class="mono queue-capacity-gpu-nums">
            总共 <strong>${fmt(t)}</strong>
            · 已分配 <strong>${fmt(a)}</strong>
            · 剩余可分配 <strong class="${remain ? "text-success" : "text-danger"}">${fmt(remain)}</strong>
            · <strong class="${pctColor}">${pct}%</strong>
          </span>
        </div>
        <div class="capacity-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(label)} 已分配 ${pct}%">
          <div class="capacity-fill ${tone}" style="width:${pct}%" title="已分配 ${fmt(a)} / ${fmt(t)}（${pct}%）"></div>
        </div>
      </div>`;
  }

  function clusterResColTitle(label) {
    return `<th class="th-res-usage" title="当前实际使用量 / 物理总量，不是队列已分配额度">${escapeHtml(label)}<span class="th-sub">实际使用</span></th>`;
  }

  function clusterDetailResNoteHtml() {
    return `<div class="cluster-detail-res-note">GPU、CPU、内存为集群<strong>当前实际使用量</strong>（Running 任务占用 / 物理总量），不是队列已分配额度。</div>`;
  }

  function renderQuotaBar(used, total, unit) {
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const free = Math.max(0, total - used);
    return `
      <div class="quota-bar-block">
        <div class="quota-bar-meta">
          <span>已用 <strong>${used}</strong>${unit || ""}</span>
          <span class="text-muted">额度 ${total}${unit || ""} · 剩余 <strong class="${free === 0 ? "text-danger" : "text-success"}">${free}</strong></span>
        </div>
        <div class="progress"><div class="progress-bar ${quotaBarClass(pct)}" style="width:${pct}%"></div></div>
        <div class="quota-bar-pct text-muted">${pct}%</div>
      </div>`;
  }

  /**
   * 按数据中心聚合集群物理容量。
   * @param {string[]|null} dcIds 仅统计这些数据中心；空/null 表示全部
   */
  function clusterCapacityByDc(dcIds) {
    const allow = dcIds && dcIds.length ? new Set(dcIds) : null;
    const map = {};
    (MOCK.clusterCapacity || []).forEach((c) => {
      if (allow && !allow.has(c.dc)) return;
      if (!map[c.dc]) {
        map[c.dc] = { dc: c.dc, total: 0, used: 0, free: 0, fault: 0, nodes: 0, cpuTotal: 0, memTotalGi: 0, types: [] };
      }
      const row = map[c.dc];
      row.total += c.total;
      row.used += c.used;
      row.free += c.free;
      row.fault += c.fault;
      row.nodes += c.nodes;
      row.cpuTotal += c.cpuTotal || 0;
      row.memTotalGi += c.memTotalGi || 0;
      row.types.push(c);
    });
    return Object.values(map);
  }

  /** 概览 KPI：优先用当前集群 + 节点实算，缺省回退 MOCK.overview */
  function dashboardStatsOfCurrentCluster() {
    const o = MOCK.overview || {};
    const cluster = findCluster(getCurrentClusterId());
    const nodes = nodesOfCurrentCluster();
    const dcIds = cluster?.dcs || [];
    // 仅当集群在线且确有资源时，才用全局 clusterCapacity（当前 mock 按主训练集群建模）
    const hasLiveResources =
      !!cluster &&
      cluster.status !== "Offline" &&
      ((cluster.gpuTotal || 0) > 0 || nodes.length > 0);
    const caps = hasLiveResources
      ? clusterCapacityByDc(dcIds.length ? dcIds : null)
      : [];

    let gpuTotal = 0;
    let gpuUsed = 0;
    let gpuFree = 0;
    let gpuFault = 0;
    caps.forEach((c) => {
      gpuTotal += c.total || 0;
      gpuUsed += c.used || 0;
      gpuFree += c.free || 0;
      gpuFault += c.fault || 0;
    });
    // 无容量明细时，用集群字段；主集群再兜底 overview
    if (!gpuTotal && cluster) {
      gpuTotal = cluster.gpuTotal || 0;
      gpuUsed = cluster.gpuUsed || 0;
      gpuFree = Math.max(0, gpuTotal - gpuUsed);
      gpuFault = 0;
    }
    if (!gpuTotal && hasLiveResources) {
      gpuTotal = o.gpuTotal || 0;
      gpuUsed = o.gpuUsed || 0;
      gpuFree = o.gpuFree || Math.max(0, gpuTotal - gpuUsed);
      gpuFault = o.gpuFault || 0;
    }

    // 节点总量：集群元数据 / overview 为准（mock 节点列表为样例子集）
    const nodesTotal = hasLiveResources
      ? cluster?.nodesTotal || o.nodesTotal || nodes.length || 0
      : cluster?.nodesTotal || nodes.length || 0;
    const nodesIsolated = nodes.filter((n) => maintStateOf(n) === "isolated").length;
    const nodesNotReadySample = nodes.filter((n) => n.status === "NotReady").length;
    const nodesNotReady = hasLiveResources
      ? Math.max(nodesNotReadySample, o.nodesNotReady || 0)
      : nodesNotReadySample;
    const nodesReady = hasLiveResources
      ? cluster?.nodesReady ?? o.nodesReady ?? Math.max(0, nodesTotal - nodesNotReady - nodesIsolated)
      : cluster?.nodesReady ?? nodes.filter((n) => n.status === "Ready").length;
    const nodesCordoned = nodesIsolated || (hasLiveResources ? o.nodesCordoned || 0 : 0);
    const nodesUnsetDc = nodes.filter((n) => !hasNodeDc(n)).length;
    const ibNodes = nodes.filter((n) => n.hasIB);
    const ibHealthyNodes = ibNodes.filter((n) => n.ib === "healthy").length;
    const ibHealthy = !hasLiveResources
      ? 0
      : ibNodes.length > 0
        ? Math.round((ibHealthyNodes / ibNodes.length) * 1000) / 10
        : o.ibHealthy ?? 100;

    const jobsRunning = (MOCK.jobs || []).filter((j) => j.status === "running" || j.status === "starting").length;
    const jobsQueued = (MOCK.jobs || []).filter((j) => j.status === "queued").length;
    const jobsFailed24h = (MOCK.jobs || []).filter((j) => j.status === "failed").length;
    const alertsOpenList = (MOCK.alerts || []).filter(isAlertUnhandled);
    const alertsCritical = alertsOpenList.filter((a) => a.severity === "critical").length;

    const storageUsedTB = o.storageUsedTB ?? 0;
    const storageTotalTB = o.storageTotalTB ?? 0;
    const gpuUtil = gpuTotal ? ((gpuUsed / gpuTotal) * 100).toFixed(1) : "0.0";

    return {
      cluster,
      nodes,
      dcIds,
      gpuTotal,
      gpuUsed,
      gpuFree,
      gpuFault,
      gpuUtil,
      nodesTotal,
      nodesReady,
      nodesIsolated,
      nodesCordoned,
      nodesNotReady,
      nodesUnsetDc,
      ibHealthy,
      ibNodes: ibNodes.length,
      jobsRunning,
      jobsQueued,
      jobsFailed24h,
      alertsOpen: alertsOpenList.length,
      alertsCritical,
      storageUsedTB: hasLiveResources ? storageUsedTB : 0,
      storageTotalTB: hasLiveResources ? storageTotalTB : 0,
      hasLiveResources,
    };
  }

  /* ---------- Utilities ---------- */
  function badge(status, opts) {
    const m = STATUS_MAP[status] || { label: status, cls: "badge-info" };
    const o = opts && typeof opts === "object" ? opts : {};
    const extra = o.className ? ` ${o.className}` : "";
    const attrs = [];
    if (o.tip) {
      attrs.push(`data-tip="${escapeHtml(o.tip)}"`);
      attrs.push(`tabindex="0"`);
      attrs.push(`aria-label="${escapeHtml(`${m.label}：${o.tip}`)}"`);
    }
    return `<span class="badge ${m.cls}${extra}"${attrs.length ? ` ${attrs.join(" ")}` : ""}>${m.label}</span>`;
  }

  function jobFailReason(job) {
    if (!job || job.status !== "failed") return "";
    const direct = String(job.failReason || "").trim();
    if (direct) return direct;
    const ev = [...(job.events || [])]
      .reverse()
      .find((e) => /失败|NCCL|error|timeout|OOM/i.test(String(e.event || "")));
    return (ev && String(ev.event).trim()) || "任务执行失败，可打开详情查看事件与日志";
  }

  function jobStatusBadge(job) {
    if (!job) return "";
    const tip = jobFailReason(job);
    if (tip) return badge(job.status, { className: "badge-has-tip", tip });
    return badge(job.status);
  }

  function toast(msg, type = "success") {
    const box = $("#toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  function confirmHintVariant(action) {
    if (action === "enable" || action === "recover" || action === "restore" || action === "uncordon") {
      return "is-success";
    }
    if (action === "disable") return "is-warning";
    return "is-danger";
  }

  function setConfirmHint(el, text, action) {
    if (!el) return;
    el.textContent = text || "";
    el.className = `modal-hint ${confirmHintVariant(action)}`;
  }

  /** 停止任务二次确认弹窗；pendingStopJobId 为待停止任务 */
  let pendingStopJobId = null;

  function openStopJobConfirm(jobId) {
    const job = findJob(jobId);
    if (!job) {
      toast("未找到任务", "error");
      return;
    }
    pendingStopJobId = job.id;
    const nameEl = $("#modal-stop-job-name");
    const idEl = $("#modal-stop-job-id");
    if (nameEl) nameEl.textContent = job.name;
    if (idEl) idEl.textContent = job.id;
    $("#modal-stop-job")?.classList.add("show");
  }

  function closeStopJobConfirm() {
    pendingStopJobId = null;
    $("#modal-stop-job")?.classList.remove("show");
  }

  function confirmStopJob() {
    const id = pendingStopJobId;
    if (!id) {
      closeStopJobConfirm();
      return;
    }
    const job = findJob(id);
    // 演示：更新本地状态
    if (job && (job.status === "running" || job.status === "queued" || job.status === "starting")) {
      job.status = "cancelled";
      job.endedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
      job.duration = job.duration && job.duration !== "-" ? job.duration : "—";
      if (!job.events) job.events = [];
      job.events.push({
        time: new Date().toTimeString().slice(0, 8),
        event: "用户确认停止任务",
      });
    }
    closeStopJobConfirm();
    toast(`已发送停止指令: ${job?.name || id}`, "warning");
    // 刷新当前视图
    if ($("#page-job-detail")?.classList.contains("active") && currentJobId === id) {
      renderJobDetail();
    } else if ($("#page-jobs")?.classList.contains("active")) {
      renderJobs();
    } else if ($("#page-dashboard")?.classList.contains("active")) {
      renderDashboard();
    }
  }

  /**
   * 带坐标轴、单位、网格与悬停十字线的折线图（SVG）。
   * 之前用的是无轴 sparkline，因此看不到刻度/单位，也没有 hover 竖线。
   */
  let _chartSeq = 0;
  function lineChart(opts) {
    const values = opts.values || [];
    if (!values.length) return `<div class="empty-state" style="padding:24px">无数据</div>`;

    const color = opts.color || "#22d3ee";
    const unit = opts.unit || "%";
    const w = opts.w || 560;
    const h = opts.h || 200;
    const rangeKey = opts.range || "1h"; // 1h | 6h | 24h
    const fixedPct = opts.fixedPct !== false && unit === "%";
    const id = `ch${++_chartSeq}`;
    const gid = `cg-${id}`;

    const pad = { l: 62, r: 16, t: 20, b: 42 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    let yMin;
    let yMax;
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    if (fixedPct) {
      yMin = 0;
      yMax = 100;
    } else if (unit === "°C") {
      yMin = 0;
      yMax = Math.max(80, Math.ceil(dataMax / 10) * 10);
    } else if (unit === "kW") {
      yMin = 0;
      yMax = Math.max(1, Math.ceil((dataMax * 1.15) * 2) / 2);
    } else {
      const padY = (dataMax - dataMin) * 0.12 || 1;
      yMin = Math.max(0, dataMin - padY);
      yMax = dataMax + padY;
    }
    if (yMax <= yMin) yMax = yMin + 1;

    const yTicks = 4;
    const xTo = (i) => pad.l + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
    const yTo = (v) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const pts = values.map((v, i) => `${xTo(i).toFixed(2)},${yTo(v).toFixed(2)}`).join(" ");
    const areaPts = `${xTo(0).toFixed(2)},${(pad.t + plotH).toFixed(2)} ${pts} ${xTo(values.length - 1).toFixed(2)},${(pad.t + plotH).toFixed(2)}`;

    // Y grid + labels（数值 + 单位）
    let yAxis = "";
    for (let t = 0; t <= yTicks; t++) {
      const v = yMin + ((yMax - yMin) * t) / yTicks;
      const y = yTo(v);
      const num =
        unit === "kW" || unit === "°C" || (yMax - yMin < 20 && unit !== "%")
          ? v.toFixed(1)
          : Math.round(v).toString();
      // 刻度只在最大/最小处带单位，避免拥挤；左上角也有单位标识
      const label = t === yTicks || t === 0 ? `${num}${unit}` : num;
      yAxis += `
        <line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + plotW}" y2="${y.toFixed(1)}"
          class="ichart-grid"/>
        <text x="${pad.l - 8}" y="${y + 3.5}" text-anchor="end" class="ichart-axis-label">${label}</text>`;
    }

    // X labels (relative time) + 轴标题
    const xLabelMeta = timeAxisLabels(rangeKey, values.length);
    let xAxis = "";
    xLabelMeta.forEach(({ i, text }) => {
      const x = xTo(i);
      xAxis += `
        <line x1="${x.toFixed(1)}" y1="${pad.t + plotH}" x2="${x.toFixed(1)}" y2="${pad.t + plotH + 4}" class="ichart-tick"/>
        <text x="${x.toFixed(1)}" y="${h - 12}" text-anchor="middle" class="ichart-axis-label">${text}</text>`;
    });
    xAxis += `<text x="${pad.l + plotW / 2}" y="${h - 1}" text-anchor="middle" class="ichart-axis-title">时间</text>`;

    // 纵轴单位标识
    const unitLabel = `<text x="8" y="${pad.t + 2}" class="ichart-unit">单位: ${escapeHtml(unit)}</text>`;

    const valuesAttr = escapeHtml(JSON.stringify(values));
    const timesAttr = escapeHtml(JSON.stringify(buildTimeLabels(rangeKey, values.length)));

    return `
      <div class="ichart" id="${id}"
        data-values='${valuesAttr}'
        data-times='${timesAttr}'
        data-unit="${escapeHtml(unit)}"
        data-color="${color}"
        data-ymin="${yMin}"
        data-ymax="${yMax}"
        data-pad-l="${pad.l}"
        data-pad-r="${pad.r}"
        data-pad-t="${pad.t}"
        data-pad-b="${pad.b}"
        data-vw="${w}"
        data-vh="${h}">
        <svg class="ichart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <!-- plot frame -->
          <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" class="ichart-frame" />
          ${yAxis}
          ${xAxis}
          ${unitLabel}
          <polygon points="${areaPts}" fill="url(#${gid})" />
          <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round" class="ichart-line"/>
          <!-- interactive layer -->
          <line class="ichart-crosshair" x1="0" y1="${pad.t}" x2="0" y2="${pad.t + plotH}" visibility="hidden"/>
          <circle class="ichart-dot" r="4.5" fill="${color}" stroke="var(--chart-dot-stroke)" stroke-width="2" visibility="hidden"/>
          <rect class="ichart-hit"
            x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"
            fill="transparent" style="cursor:crosshair"/>
        </svg>
        <div class="ichart-tooltip" hidden>
          <div class="ichart-tip-time"></div>
          <div class="ichart-tip-val"></div>
        </div>
      </div>`;
  }

  function timeAxisLabels(rangeKey, n) {
    // 3~5 个刻度：起点 / 中间 / 终点
    const end = Math.max(0, n - 1);
    const mid = Math.round(end / 2);
    const q1 = Math.round(end / 4);
    const q3 = Math.round((end * 3) / 4);
    const labelAt = (i) => {
      const frac = end === 0 ? 1 : i / end;
      return formatRelativeTime(rangeKey, frac);
    };
    if (n < 8) {
      return [
        { i: 0, text: labelAt(0) },
        { i: end, text: labelAt(end) },
      ];
    }
    return [
      { i: 0, text: labelAt(0) },
      { i: q1, text: labelAt(q1) },
      { i: mid, text: labelAt(mid) },
      { i: q3, text: labelAt(q3) },
      { i: end, text: labelAt(end) },
    ];
  }

  function rangeToMs(rangeKey) {
    if (rangeKey === "6h") return 6 * 3600 * 1000;
    if (rangeKey === "24h") return 24 * 3600 * 1000;
    return 3600 * 1000; // 1h
  }

  function formatRelativeTime(rangeKey, frac) {
    // frac 0 = 范围起点（过去），1 = 现在
    if (frac >= 0.98) return "现在";
    const totalMin = rangeToMs(rangeKey) / 60000;
    const agoMin = Math.round(totalMin * (1 - frac));
    if (agoMin >= 60) {
      const h = Math.floor(agoMin / 60);
      const m = agoMin % 60;
      return m ? `-${h}h${m}m` : `-${h}h`;
    }
    return `-${agoMin}m`;
  }

  function buildTimeLabels(rangeKey, n) {
    const now = Date.now();
    const span = rangeToMs(rangeKey);
    const labels = [];
    for (let i = 0; i < n; i++) {
      const t = now - span + (n === 1 ? span : (i / (n - 1)) * span);
      const d = new Date(t);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      labels.push(`${hh}:${mm}`);
    }
    return labels;
  }

  function bindCharts(root = document) {
    $$(`.ichart`, root).forEach((wrap) => {
      if (wrap._chartBound) return;
      wrap._chartBound = true;

      const values = JSON.parse(wrap.dataset.values || "[]");
      const times = JSON.parse(wrap.dataset.times || "[]");
      const unit = wrap.dataset.unit || "";
      const yMin = +wrap.dataset.ymin;
      const yMax = +wrap.dataset.ymax;
      const padL = +wrap.dataset.padL;
      const padR = +wrap.dataset.padR;
      const padT = +wrap.dataset.padT;
      const padB = +wrap.dataset.padB;
      const vw = +wrap.dataset.vw;
      const vh = +wrap.dataset.vh;

      const svg = $(".ichart-svg", wrap);
      const hit = $(".ichart-hit", wrap);
      const cross = $(".ichart-crosshair", wrap);
      const dot = $(".ichart-dot", wrap);
      const tip = $(".ichart-tooltip", wrap);
      const tipTime = $(".ichart-tip-time", tip);
      const tipVal = $(".ichart-tip-val", tip);
      if (!svg || !hit || !values.length) return;

      const plotW = vw - padL - padR;
      const plotH = vh - padT - padB;

      const xTo = (i) => padL + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
      const yTo = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

      function clientToSvg(clientX, clientY) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        return pt.matrixTransform(ctm.inverse());
      }

      function showAt(idx) {
        const v = values[idx];
        const x = xTo(idx);
        const y = yTo(v);
        cross.setAttribute("x1", x);
        cross.setAttribute("x2", x);
        cross.setAttribute("visibility", "visible");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("visibility", "visible");

        const timeText = times[idx] || "";
        tipTime.textContent = timeText;
        tipVal.textContent = `${Number(v).toFixed(unit === "kW" ? 2 : 1)} ${unit}`;
        tip.hidden = false;

        // position tooltip in HTML space
        const rect = svg.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const sx = rect.left - wrapRect.left + (x / vw) * rect.width;
        const sy = rect.top - wrapRect.top + (y / vh) * rect.height;
        const tipW = tip.offsetWidth || 90;
        let left = sx + 12;
        if (left + tipW > wrapRect.width - 4) left = sx - tipW - 12;
        tip.style.left = `${Math.max(0, left)}px`;
        tip.style.top = `${Math.max(0, sy - 40)}px`;
      }

      function hide() {
        cross.setAttribute("visibility", "hidden");
        dot.setAttribute("visibility", "hidden");
        tip.hidden = true;
      }

      hit.addEventListener("mousemove", (e) => {
        const p = clientToSvg(e.clientX, e.clientY);
        if (!p) return;
        const rel = Math.min(plotW, Math.max(0, p.x - padL));
        const idx =
          values.length === 1
            ? 0
            : Math.round((rel / plotW) * (values.length - 1));
        showAt(Math.max(0, Math.min(values.length - 1, idx)));
      });
      hit.addEventListener("mouseleave", hide);
    });
  }

  function genSeries(base, n = 40, variance = 8, clampMin = 0, clampMax = 100) {
    const arr = [];
    let v = base;
    for (let i = 0; i < n; i++) {
      v = Math.max(clampMin, Math.min(clampMax, v + (Math.random() - 0.48) * variance));
      arr.push(+v.toFixed(1));
    }
    return arr;
  }

  function findJob(id) {
    return MOCK.jobs.find((j) => j.id === id) || MOCK.jobs[0];
  }

  function jobTimeText(value) {
    if (value == null || value === "" || value === "-") return "—";
    return String(value);
  }

  function jobEndedAtText(job) {
    if (!job) return "—";
    if (["success", "failed", "cancelled"].includes(job.status)) {
      return jobTimeText(job.endedAt);
    }
    return "—";
  }

  /* ---------- Navigation ---------- */
  /* ---------- Auth (LDAP / 平台管理员) ---------- */
  /** 当前登录页选中的方式：ldap | admin */
  let loginMode = "ldap";

  function consumeAuthHandoff() {
    try {
      const raw = localStorage.getItem(AUTH_HANDOFF_KEY);
      if (!raw) return;
      localStorage.removeItem(AUTH_HANDOFF_KEY);
      if (!sessionStorage.getItem(AUTH_KEY)) sessionStorage.setItem(AUTH_KEY, raw);
    } catch {
      /* ignore */
    }
  }

  function getAuth() {
    consumeAuthHandoff();
    try {
      const raw = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setAuth(user, method) {
    const payload = JSON.stringify({
      ...user,
      loginAt: new Date().toISOString(),
      method: method || user?.method || "ldap",
    });
    // 仅会话级登录，关闭页签后需重新登录
    sessionStorage.setItem(AUTH_KEY, payload);
    localStorage.removeItem(AUTH_KEY);
  }

  function clearAuth() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* ignore quota / private mode */
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    const label = next === "light" ? "切换到深色主题" : "切换到浅色主题";
    $$(".js-theme-toggle").forEach((btn) => {
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.setAttribute("aria-pressed", next === "light" ? "true" : "false");
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  }

  function initTheme() {
    applyTheme(getSavedTheme());
    $$(".js-theme-toggle").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });
  }

  function isSidebarCollapsed() {
    return document.documentElement.getAttribute("data-sidebar") === "collapsed";
  }

  function applySidebarCollapsed(collapsed) {
    const next = !!collapsed;
    if (next) document.documentElement.setAttribute("data-sidebar", "collapsed");
    else document.documentElement.removeAttribute("data-sidebar");
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
    const label = next ? "展开侧栏" : "折叠侧栏";
    $$(".js-sidebar-toggle").forEach((btn) => {
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.setAttribute("aria-pressed", next ? "true" : "false");
    });
    hideSidebarNavTip();
    if (next) closeSidebarUserMenu();
  }

  function toggleSidebarCollapsed() {
    applySidebarCollapsed(!isSidebarCollapsed());
  }

  function sidebarNavTipText(el) {
    if (!el) return "";
    const label = el.querySelector(".nav-item-label")?.textContent
      || (el.id === "sidebar-user" ? ($("#sidebar-user-name")?.textContent || "账户菜单") : "")
      || el.querySelector(".theme-toggle-label:not([style*='display: none'])")?.textContent
      || (el.classList.contains("js-theme-toggle")
        ? (document.documentElement.getAttribute("data-theme") === "light" ? "深色主题" : "浅色主题")
        : "");
    return String(label || el.getAttribute("data-nav-label") || el.getAttribute("aria-label") || "").trim();
  }

  function ensureSidebarNavTip() {
    let el = $("#nav-flyout-tip");
    if (el) return el;
    el = document.createElement("div");
    el.id = "nav-flyout-tip";
    el.className = "nav-flyout-tip";
    el.setAttribute("role", "tooltip");
    document.body.appendChild(el);
    return el;
  }

  function hideSidebarNavTip() {
    $("#nav-flyout-tip")?.classList.remove("is-visible");
  }

  function showSidebarNavTip(anchor) {
    if (!isSidebarCollapsed() || !anchor) {
      hideSidebarNavTip();
      return;
    }
    const text = sidebarNavTipText(anchor);
    if (!text) {
      hideSidebarNavTip();
      return;
    }
    const tip = ensureSidebarNavTip();
    tip.textContent = text;
    const rect = anchor.getBoundingClientRect();
    const gap = 10;
    tip.style.left = `${Math.round(rect.right + gap)}px`;
    tip.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
    tip.classList.add("is-visible");
    const tipRect = tip.getBoundingClientRect();
    const maxTop = window.innerHeight - tipRect.height / 2 - 8;
    const minTop = tipRect.height / 2 + 8;
    const cy = rect.top + rect.height / 2;
    tip.style.top = `${Math.round(Math.max(minTop, Math.min(maxTop, cy)))}px`;
  }

  function initSidebarNavTips() {
    const root = $(".sidebar");
    if (!root) return;
    root.addEventListener("pointerover", (e) => {
      const item = e.target?.closest?.(".nav-item, .sidebar-theme-toggle, #sidebar-user");
      if (item && root.contains(item)) showSidebarNavTip(item);
    });
    root.addEventListener("pointerout", (e) => {
      const item = e.target?.closest?.(".nav-item, .sidebar-theme-toggle, #sidebar-user");
      if (!item) return;
      const next = e.relatedTarget;
      if (next && item.contains(next)) return;
      hideSidebarNavTip();
    });
    root.querySelector(".sidebar-nav")?.addEventListener("scroll", hideSidebarNavTip, { passive: true });
  }

  function initSidebarCollapse() {
    applySidebarCollapsed(isSidebarCollapsed());
    $$(".js-sidebar-toggle").forEach((btn) => {
      btn.addEventListener("click", toggleSidebarCollapsed);
    });
    initSidebarNavTips();
  }

  function applyUserToShell(user) {
    const name = user?.name || MOCK.user?.name || "用户";
    const isAdmin = !!(user?.isAdmin || user?.method === "admin");
    const roleId = isAdmin ? null : user?.roleId || MOCK.user?.roleId || null;
    const roleName = isAdmin
      ? user?.role || "平台管理员"
      : getRoleName(roleId) || user?.role || user?.title || "";
    const initials = user?.initials || name.slice(0, 1);
    const username = user?.username || MOCK.user?.username || "";
    // 同步运行时当前用户，供团队 / 队列 / 菜单权限等使用
    MOCK.user = {
      name,
      role: roleName,
      roleId,
      title: user?.title || roleName,
      initials,
      username,
      method: user?.method || "ldap",
      isAdmin,
    };
    const av = $("#sidebar-user-avatar");
    const nm = $("#sidebar-user-name");
    const rl = $("#sidebar-user-role");
    const menuName = $("#sidebar-menu-name");
    const menuSub = $("#sidebar-menu-sub");
    if (av) av.textContent = initials;
    if (nm) nm.textContent = name;
    if (rl) rl.textContent = roleName;
    if (menuName) menuName.textContent = name;
    if (menuSub) {
      const methodLabel = isAdmin ? "平台管理员" : username || roleName || "—";
      menuSub.textContent = isAdmin ? `${username} · ${methodLabel}` : username || roleName || "—";
    }
    applyNavPermissions();
  }

  function closeSidebarUserMenu() {
    const wrap = $("#sidebar-user-wrap");
    const menu = $("#sidebar-user-menu");
    const btn = $("#sidebar-user");
    wrap?.classList.remove("is-open");
    menu?.classList.add("hidden");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function toggleSidebarUserMenu(e) {
    e?.stopPropagation?.();
    const wrap = $("#sidebar-user-wrap");
    const menu = $("#sidebar-user-menu");
    const btn = $("#sidebar-user");
    if (!wrap || !menu) return;
    const open = wrap.classList.contains("is-open");
    if (open) {
      closeSidebarUserMenu();
    } else {
      wrap.classList.add("is-open");
      menu.classList.remove("hidden");
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
  }

  function showAppShell() {
    $("#login-screen")?.classList.add("hidden");
    $("#app-shell")?.classList.remove("hidden");
  }

  /**
   * 切换登录方式并同步表单文案 / 演示说明
   * @param {"ldap"|"admin"} mode
   * @param {{ clearError?: boolean, focus?: boolean }} opts
   */
  function setLoginMode(mode, opts = {}) {
    const next = mode === "admin" ? "admin" : "ldap";
    loginMode = next;
    const isAdmin = next === "admin";

    $$("#login-mode-tabs .login-mode-tab").forEach((tab) => {
      const active = tab.dataset.mode === next;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    const subtitle = $("#login-subtitle");
    const userLabel = $("#login-username-label");
    const userInput = $("#login-username");
    const pwdInput = $("#login-password");
    const submitText = $("#login-submit-text");

    if (subtitle) subtitle.textContent = isAdmin ? "平台管理员登录" : "企业 LDAP 身份认证";
    if (userLabel) userLabel.textContent = isAdmin ? "平台管理员账号" : "域账号";
    if (userInput) {
      userInput.placeholder = isAdmin ? "admin" : "algo 或 sre";
      userInput.setAttribute("autocomplete", isAdmin ? "username" : "username");
    }
    if (pwdInput) {
      pwdInput.placeholder = isAdmin ? "admin123" : "对应演示密码";
    }
    if (submitText) submitText.textContent = isAdmin ? "平台管理员登录" : "LDAP 登录";
    updateLoginDemoTip(next);

    if (opts.clearError !== false) {
      const err = $("#login-error");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
    }
    if (opts.focus !== false) {
      setTimeout(() => $("#login-username")?.focus(), 30);
    }
  }

  /** 登录页演示账号提示（随 LDAP / 管理员入口切换高亮） */
  function updateLoginDemoTip(mode) {
    const box = $("#login-demo-accounts");
    if (!box) return;
    const list = MOCK.demoLogins || [
      { mode: "admin", username: "admin", password: "admin123", label: "平台管理员" },
      { mode: "ldap", username: "algo", password: "algo123", label: "算法工程师" },
      { mode: "ldap", username: "sre", password: "sre123", label: "SRE工程师" },
    ];
    const cur = mode === "admin" ? "admin" : "ldap";
    box.innerHTML = list
      .map((a) => {
        const active = a.mode === cur;
        const entry = a.mode === "admin" ? "管理员入口" : "LDAP 入口";
        return `
        <button type="button" class="login-demo-account ${active ? "is-active" : ""}" data-demo-user="${escapeHtml(a.username)}" data-demo-pass="${escapeHtml(a.password)}" data-demo-mode="${escapeHtml(a.mode)}">
          <span class="login-demo-account-label">${escapeHtml(a.label)}</span>
          <span class="login-demo-account-cred mono"><code>${escapeHtml(a.username)}</code> / <code>${escapeHtml(a.password)}</code></span>
          <span class="login-demo-account-entry">${escapeHtml(entry)}</span>
        </button>`;
      })
      .join("");

    $$(".login-demo-account", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.dataset.demoMode === "admin" ? "admin" : "ldap";
        if (loginMode !== m) setLoginMode(m, { clearError: true, focus: false });
        const u = $("#login-username");
        const p = $("#login-password");
        if (u) {
          u.value = btn.dataset.demoUser || "";
          u.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (p) {
          p.value = btn.dataset.demoPass || "";
          p.dispatchEvent(new Event("input", { bubbles: true }));
        }
        setTimeout(() => $("#login-password")?.focus(), 30);
      });
    });
  }

  function toggleLoginDemoTip() {
    const tip = $("#login-demo-tip");
    const body = $("#login-demo-tip-body");
    const toggle = $("#login-demo-tip-toggle");
    if (!tip || !body) return;
    const open = tip.classList.contains("is-collapsed");
    tip.classList.toggle("is-collapsed", !open);
    body.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function showLoginScreen(msg) {
    $("#app-shell")?.classList.add("hidden");
    $("#login-screen")?.classList.remove("hidden");
    // 同步当前登录方式文案；有 msg 时保留错误展示
    setLoginMode(loginMode, { clearError: !msg, focus: false });
    const err = $("#login-error");
    if (err && msg) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
    setTimeout(() => $("#login-username")?.focus(), 50);
  }

  /**
   * 解析 LDAP 可登录用户：必须在平台用户列表（ldapUsers）中且 status === active
   * 若用户配置了 password 字段则校验密码（演示账号 algo/algo123、sre/sre123）
   * @param {string} username
   * @param {string} [password]
   * @param {{ skipPassword?: boolean }} [opts] 会话恢复时跳过密码校验
   * @returns {{ ok: true, user } | { ok: false, reason: string }}
   */
  function resolvePlatformLoginUser(username, password, opts = {}) {
    const raw = (username || "").trim();
    if (!raw) return { ok: false, reason: "请输入域账号" };
    const uid = (raw.includes("@") ? raw.split("@")[0] : raw).toLowerCase();
    const list = MOCK.ldapUsers || [];
    const hit =
      list.find((u) => (u.username || "").toLowerCase() === uid) ||
      list.find((u) => u.name === raw || (u.email || "").toLowerCase() === raw.toLowerCase());

    if (!hit) {
      return {
        ok: false,
        reason: "该账号不在平台可用用户列表中，请联系管理员从 LDAP 添加",
      };
    }
    if (hit.status !== "active") {
      return {
        ok: false,
        reason: "该账号已停用，无法登录，请联系管理员启用",
      };
    }
    // 演示账号或显式配置了 password 的用户：校验密码（会话恢复除外）
    if (!opts.skipPassword && hit.password != null && hit.password !== "") {
      if (!password) return { ok: false, reason: "请输入密码" };
      if (password !== String(hit.password)) {
        return { ok: false, reason: "域账号或密码错误" };
      }
    }
    const roleId = hit.roleId || "role-algo";
    const roleName = getRoleName(roleId);
    return {
      ok: true,
      user: {
        name: hit.name,
        role: roleName,
        roleId,
        title: hit.title || "",
        initials: (hit.name || uid).slice(0, 1),
        username: hit.username,
        email: hit.email,
        department: hit.department,
        method: "ldap",
        isAdmin: false,
      },
    };
  }

  /**
   * 校验平台管理员账号（本地，不经 LDAP）
   * 默认 admin / admin123
   */
  function resolveAdminLogin(username, password) {
    const raw = (username || "").trim();
    if (!raw) return { ok: false, reason: "请输入平台管理员账号" };
    if (!password) return { ok: false, reason: "请输入平台管理员密码" };

    const admin = MOCK.platformAdmin || {
      username: "admin",
      password: "admin123",
      name: "平台管理员",
      role: "平台管理员",
      title: "平台管理员",
      initials: "管",
    };
    const uid = raw.toLowerCase();
    if (uid !== String(admin.username || "admin").toLowerCase()) {
      return { ok: false, reason: "平台管理员账号或密码错误" };
    }
    if (password !== String(admin.password || "admin123")) {
      return { ok: false, reason: "平台管理员账号或密码错误" };
    }
    return {
      ok: true,
      user: {
        name: admin.name || "平台管理员",
        role: admin.role || "平台管理员",
        title: admin.title || "平台管理员",
        initials: admin.initials || "管",
        username: admin.username || "admin",
        email: admin.email || "admin@maip.local",
        department: admin.department || "系统内置",
        method: "admin",
        isAdmin: true,
      },
    };
  }

  function handleLoginSubmit(e) {
    e?.preventDefault?.();
    const username = $("#login-username")?.value || "";
    const password = $("#login-password")?.value || "";
    const err = $("#login-error");
    const btn = $("#login-submit");
    const mode = loginMode === "admin" ? "admin" : "ldap";

    if (!username.trim()) {
      if (err) {
        err.textContent = mode === "admin" ? "请输入平台管理员账号" : "请输入域账号";
        err.classList.remove("hidden");
      }
      $("#login-username")?.focus();
      return;
    }
    if (!password) {
      if (err) {
        err.textContent = mode === "admin" ? "请输入平台管理员密码" : "请输入密码";
        err.classList.remove("hidden");
      }
      $("#login-password")?.focus();
      return;
    }

    if (err) err.classList.add("hidden");
    btn?.classList.add("is-loading");
    $(".login-submit-text", btn)?.classList.add("hidden");
    $(".login-submit-loading", btn)?.classList.remove("hidden");

    // 模拟鉴权延迟：LDAP bind / 平台管理员校验
    setTimeout(() => {
      const result =
        mode === "admin"
          ? resolveAdminLogin(username, password)
          : resolvePlatformLoginUser(username, password);

      btn?.classList.remove("is-loading");
      $(".login-submit-text", btn)?.classList.remove("hidden");
      $(".login-submit-loading", btn)?.classList.add("hidden");

      if (!result.ok) {
        if (err) {
          err.textContent = result.reason;
          err.classList.remove("hidden");
        }
        return;
      }

      const user = result.user;
      setAuth(user, mode);
      applyUserToShell(user);
      showAppShell();
      toast(
        mode === "admin"
          ? `平台管理员登录成功，欢迎 ${user.name}`
          : `LDAP 登录成功，欢迎 ${user.name}`,
      );
      const hash = location.hash.replace("#", "");
      const hashPage = hash && hash !== "login" ? hash.split("/")[0] : "";
      if (hashPage && $(`#page-${hashPage}`) && canAccessPage(hashPage)) {
        routeFromHash();
      } else {
        const home = getDefaultHomePage();
        navigate(home);
        location.hash = home;
      }
    }, 550);
  }

  function openLogoutConfirm() {
    closeSidebarUserMenu();
    const name = MOCK.user?.name || "当前用户";
    const username = MOCK.user?.username || "";
    const isAdmin = !!MOCK.user?.isAdmin || MOCK.user?.method === "admin";
    const nameEl = $("#modal-logout-name");
    const metaEl = $("#modal-logout-meta");
    if (nameEl) nameEl.textContent = name;
    if (metaEl) {
      metaEl.textContent = username
        ? isAdmin
          ? `${username} · 平台管理员`
          : `${username}`
        : isAdmin
          ? "平台管理员"
          : "";
    }
    $("#modal-logout")?.classList.add("show");
  }

  function closeLogoutConfirm() {
    $("#modal-logout")?.classList.remove("show");
  }

  function handleLogout() {
    closeLogoutConfirm();
    closeSidebarUserMenu();
    clearAuth();
    showLoginScreen();
    toast("已退出登录", "info");
    location.hash = "login";
  }

  /** 会话仍有效：平台管理员账号 或 平台 LDAP 启用用户 */
  function restoreSessionIfValid() {
    const auth = getAuth();
    if (!auth?.username && !auth?.name) return false;

    // 平台管理员会话
    if (auth.method === "admin" || auth.isAdmin) {
      const admin = MOCK.platformAdmin || { username: "admin", name: "平台管理员" };
      const uid = String(auth.username || "").toLowerCase();
      if (uid && uid !== String(admin.username || "admin").toLowerCase()) {
        clearAuth();
        return false;
      }
      const user = {
        name: admin.name || auth.name || "平台管理员",
        role: admin.role || "平台管理员",
        title: admin.title || "平台管理员",
        initials: admin.initials || "管",
        username: admin.username || "admin",
        email: admin.email || auth.email,
        department: admin.department || "系统内置",
        method: "admin",
        isAdmin: true,
      };
      applyUserToShell(user);
      loginMode = "admin";
      return true;
    }

    // LDAP 用户会话（已登录态恢复，跳过密码）
    const result = resolvePlatformLoginUser(auth.username || auth.name, null, { skipPassword: true });
    if (!result.ok) {
      clearAuth();
      return false;
    }
    applyUserToShell(result.user);
    loginMode = "ldap";
    return true;
  }

  function navigate(page, opts = {}) {
    if (!opts.force && shouldBlockConfigEditLeave(page)) {
      pendingConfigDirtyLeave = { page, opts };
      openConfigDirtyModal();
      return;
    }

    $$(".page").forEach((p) => p.classList.remove("active"));
    $$(".nav-item").forEach((n) => n.classList.remove("active"));

    // 节点维护已合并至节点管理（兼容旧 hash / 跳转）
    if (page === "maintenance") page = "node-mgmt";

    // 无权限页面：回退到默认首页
    if (!canAccessPage(page)) {
      const home = getDefaultHomePage();
      if (page !== home) {
        toast("当前角色无权访问该页面", "warning");
        page = home;
      }
    }

    let pageEl = $(`#page-${page}`);
    if (!pageEl) {
      page = getDefaultHomePage();
    }
    pageEl = $(`#page-${page}`);
    if (!pageEl) {
      page = "jobs";
      pageEl = $(`#page-${page}`);
    }
    if (pageEl) pageEl.classList.add("active");

    // 工作集群作用域：平台中心 / 集群管理 / 数据中心 / 配置管理为跨集群或全局，隐藏顶栏选择
    updateWorkspaceContext({ page });

    // 侧栏高亮：详情/对比归入实验分析
    let navPage = page;
    if (page === "exp-detail" || page === "exp-compare") navPage = "experiments";
    if (page === "job-detail") navPage = "jobs";
    if (page === "config-edit" || page === "config-detail") navPage = "configs";
    const nav = $(`.nav-item[data-page="${navPage}"]`);
    if (nav) nav.classList.add("active");

    // breadcrumb
    const titles = {
      dashboard: "集群概览",
      jobs: "任务列表",
      "job-create": rerunFromJobId ? "重跑训练任务" : "创建训练任务",
      "job-detail": "任务详情",
      "my-queues": "我的队列",
      configs: "配置管理",
      "config-edit": configEditIsNew ? "新建配置集" : "发布新版本",
      "config-detail": "配置详情",
      experiments: "实验分析",
      "exp-detail": "实验详情",
      "exp-compare": "实验对比",
      platform: "平台管理",
      "dc-mgmt": "数据中心",
      "cluster-mgmt": "集群管理",
      "node-mgmt": "节点管理",
      "queue-mgmt": "队列管理",
      "user-mgmt": "用户管理",
      "team-mgmt": "团队管理",
      "role-mgmt": "角色管理",
      "system-config": "系统配置",
      alerts: "告警中心",
      /** @deprecated 已合并至节点管理 */
      maintenance: "节点管理",
    };
    const bc = $("#breadcrumb");
    if (page === "job-detail") {
      const job = findJob(currentJobId);
      bc.innerHTML = `<span class="link-cell" data-nav="jobs" style="cursor:pointer;color:var(--text-2)">任务列表</span>
        <span class="sep">/</span><span class="current">${escapeHtml(job?.name || currentJobId)}</span>`;
      $("[data-nav='jobs']", bc)?.addEventListener("click", () => navigate("jobs"));
    } else if (page === "job-create") {
      const createLabel = rerunFromJobId ? "重跑任务" : "创建任务";
      bc.innerHTML = `<span class="link-cell" data-nav="jobs" style="cursor:pointer;color:var(--text-2)">任务列表</span>
        <span class="sep">/</span><span class="current">${createLabel}</span>`;
      $("[data-nav='jobs']", bc)?.addEventListener("click", () => navigate("jobs"));
    } else if (page === "exp-detail") {
      const exp = findExperiment(currentExpId);
      bc.innerHTML = `<span class="link-cell" data-nav="experiments" style="cursor:pointer;color:var(--text-2)">实验分析</span>
        <span class="sep">/</span><span class="current">${escapeHtml(exp?.name || currentExpId)}</span>`;
      $("[data-nav='experiments']", bc)?.addEventListener("click", () => navigate("experiments"));
    } else if (page === "exp-compare") {
      bc.innerHTML = `<span class="link-cell" data-nav="experiments" style="cursor:pointer;color:var(--text-2)">实验分析</span>
        <span class="sep">/</span><span class="current">对比</span>`;
      $("[data-nav='experiments']", bc)?.addEventListener("click", () => navigate("experiments"));
    } else if (page === "config-detail") {
      const set = findConfigSet(currentConfigSetId);
      bc.innerHTML = `<span class="link-cell" data-nav="configs" style="cursor:pointer;color:var(--text-2)">配置管理</span>
        <span class="sep">/</span><span class="current">${escapeHtml(set?.displayName || currentConfigSetId || "详情")}</span>`;
      $("[data-nav='configs']", bc)?.addEventListener("click", () => navigate("configs"));
    } else if (page === "config-edit") {
      const set = findConfigSet(currentConfigSetId);
      const tail = configEditIsNew ? "新建配置集" : "发布新版本";
      const mid = !configEditIsNew && set
        ? `<span class="sep">/</span><span class="link-cell" data-nav="cfg-detail" style="cursor:pointer;color:var(--text-2)">${escapeHtml(set.displayName)}</span>`
        : "";
      bc.innerHTML = `<span class="link-cell" data-nav="configs" style="cursor:pointer;color:var(--text-2)">配置管理</span>${mid}
        <span class="sep">/</span><span class="current">${tail}</span>`;
      $("[data-nav='configs']", bc)?.addEventListener("click", () => navigate("configs"));
      $("[data-nav='cfg-detail']", bc)?.addEventListener("click", () => goConfigDetail(currentConfigSetId));
    } else if (page === "cluster-mgmt") {
      bc.innerHTML = `<span class="current">集群管理</span><span class="sep">·</span><span class="text-muted" style="font-size:12px">跨集群视图</span>`;
    } else if (page === "dc-mgmt") {
      bc.innerHTML = `<span class="current">数据中心</span><span class="sep">·</span><span class="text-muted" style="font-size:12px">全局视图</span>`;
    } else {
      bc.innerHTML = `<span class="current">${titles[page] || page}</span>`;
    }

    // render page content
    if (page === "dashboard") renderDashboard();
    if (page === "jobs") renderJobs();
    if (page === "job-create") renderJobCreate();
    if (page === "job-detail") renderJobDetail();
    if (page === "my-queues") renderMyQueues();
    if (page === "configs") renderConfigList();
    if (page === "config-edit") renderConfigEdit();
    if (page === "config-detail") renderConfigDetail();
    if (page === "experiments") renderExperiments();
    if (page === "exp-detail") renderExpDetail();
    if (page === "exp-compare") renderExpCompare();
    if (page === "platform") renderPlatform(opts.tab);
    if (page === "dc-mgmt") renderDcMgmt();
    if (page === "cluster-mgmt") renderClusterMgmt();
    if (page === "node-mgmt") renderNodeMgmt(opts);
    if (page === "queue-mgmt") renderQueueMgmt();
    if (page === "user-mgmt") renderUserMgmt();
    if (page === "team-mgmt") renderTeamMgmt();
    if (page === "role-mgmt") renderRoleMgmt();
    if (page === "system-config") renderSystemConfig(opts.tab);
    if (page === "alerts") renderAlerts();

    window.scrollTo(0, 0);
    if (page === "job-detail") {
      // 保留深链 tab（如 /metrics）
      const prev = location.hash.replace(/^#/, "").split("/");
      const keepTab =
        prev[0] === "job-detail" && prev[1] === currentJobId && prev[2]
          ? prev[2]
          : "";
      location.hash = keepTab
        ? `job-detail/${currentJobId}/${keepTab}`
        : `job-detail/${currentJobId}`;
    } else if (page === "exp-detail") {
      const prev = location.hash.replace(/^#/, "").split("/");
      const keepTab =
        prev[0] === "exp-detail" && prev[1] === currentExpId && prev[2]
          ? prev[2]
          : opts.tab || "";
      location.hash = keepTab
        ? `exp-detail/${currentExpId}/${keepTab}`
        : `exp-detail/${currentExpId}`;
    } else if (page === "exp-compare") {
      const ids = [...expListState.selectedIds];
      location.hash = `exp-compare/${ids.join(",")}`;
    } else if (page === "job-create" && rerunFromJobId) {
      location.hash = `job-create/rerun/${rerunFromJobId}`;
    } else if (page === "config-detail") {
      location.hash = `config-detail/${currentConfigSetId || ""}`;
    } else if (page === "config-edit") {
      location.hash = configEditIsNew || !currentConfigSetId ? "config-edit" : `config-edit/${currentConfigSetId}`;
    } else {
      location.hash = page;
    }
  }

  function findExperiment(id) {
    return (MOCK.experiments || []).find((e) => e.id === id);
  }

  function findExperimentsByJob(jobId) {
    return (MOCK.experiments || []).filter((e) => e.jobId === jobId);
  }

  function goExpDetail(expId) {
    currentExpId = expId;
    navigate("exp-detail");
  }

  function formatExpMetric(v, key) {
    if (v == null || Number.isNaN(+v)) return "—";
    const n = +v;
    if (key === "lr") {
      if (n === 0) return "0";
      if (n < 0.001) return n.toExponential(1);
      return n.toFixed(5);
    }
    if (key === "tokens_per_sec" || key === "throughput") {
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return String(Math.round(n));
    }
    if (Math.abs(n) >= 100) return n.toFixed(1);
    if (Math.abs(n) >= 10) return n.toFixed(2);
    return n.toFixed(3);
  }

  function expStatusBadge(status) {
    return badge(status);
  }

  /** 进入新建任务页（清空重跑上下文） */
  function goCreateJob() {
    rerunFromJobId = null;
    createFormTab = "basic";
    navigate("job-create");
  }

  /** 进入重跑页并预填原任务 */
  function goRerunJob(jobId) {
    rerunFromJobId = jobId;
    createFormTab = "basic";
    navigate("job-create");
  }

  /** 按 GPU 型号聚合容量（当前集群覆盖的数据中心） */
  function clusterCapacityByGpuType(dcIds) {
    const allow = dcIds && dcIds.length ? new Set(dcIds) : null;
    const map = {};
    (MOCK.clusterCapacity || []).forEach((c) => {
      if (allow && !allow.has(c.dc)) return;
      const key = c.gpuType || "—";
      if (!map[key]) {
        map[key] = {
          gpuType: key,
          total: 0,
          used: 0,
          free: 0,
          fault: 0,
          nodes: 0,
          hasIB: false,
          cpuTotal: 0,
          memTotalGi: 0,
          dcs: new Set(),
        };
      }
      const row = map[key];
      row.total += c.total || 0;
      row.used += c.used || 0;
      row.free += c.free || 0;
      row.fault += c.fault || 0;
      row.nodes += c.nodes || 0;
      row.cpuTotal += c.cpuTotal || 0;
      row.memTotalGi += c.memTotalGi || 0;
      if (c.hasIB) row.hasIB = true;
      if (c.dc) row.dcs.add(c.dc);
    });
    return Object.values(map).sort((a, b) => (b.total || 0) - (a.total || 0));
  }

  function shortGpuTypeLabel(name) {
    const s = String(name || "");
    if (/4090/i.test(s)) return "4090";
    const m = s.match(/^(H\d+|B\d+|A\d+|L\d+)/i);
    if (m) return m[1].toUpperCase();
    return s.replace(/^NVIDIA-GeForce-RTX-/i, "") || "GPU";
  }

  /** 集群资源：GPU 按卡型号 + CPU / 内存 / Pods。容量来自 clusterCapacity，Pods 由节点样例按节点数外推。 */
  function clusterResourcesOf(cluster) {
    const empty = {
      gpuTotal: 0,
      gpuUsed: 0,
      gpuFree: 0,
      gpuFault: 0,
      gpuByType: [],
      cpuTotal: 0,
      cpuUsed: 0,
      memTotalGi: 0,
      memUsedGi: 0,
      podsUsed: 0,
      podsCapacity: 0,
    };
    if (!cluster) return empty;
    const offline = cluster.status === "Offline";
    const dcIds = cluster.dcs || [];
    const live = !offline && ((cluster.gpuTotal || 0) > 0 || (cluster.nodesTotal || 0) > 0);
    const byType = live ? clusterCapacityByGpuType(dcIds.length ? dcIds : null) : [];
    let gpuTotal = 0;
    let gpuUsed = 0;
    let gpuFree = 0;
    let gpuFault = 0;
    let cpuTotal = 0;
    let memTotalGi = 0;
    byType.forEach((g) => {
      gpuTotal += g.total || 0;
      gpuUsed += g.used || 0;
      gpuFree += g.free || 0;
      gpuFault += g.fault || 0;
      cpuTotal += g.cpuTotal || 0;
      memTotalGi += g.memTotalGi || 0;
    });
    if (!gpuTotal) {
      gpuTotal = cluster.gpuTotal || 0;
      gpuUsed = cluster.gpuUsed || 0;
      gpuFree = Math.max(0, gpuTotal - gpuUsed);
    }
    const ratio = gpuTotal ? gpuUsed / gpuTotal : 0;
    const cpuUsed = Math.round(cpuTotal * ratio);
    const memUsedGi = Math.round(memTotalGi * ratio);
    const nodes = (MOCK.nodes || []).filter((n) => (n.clusterId || "cls-primary") === cluster.id);
    const sampleUsed = nodes.reduce((s, n) => s + (n.podCount || 0), 0);
    const sampleCap = nodes.reduce((s, n) => s + (n.podCapacity || 0), 0);
    const nodesTotal = cluster.nodesTotal || nodes.length || 0;
    const scale = nodes.length ? nodesTotal / nodes.length : 1;
    const podsUsed = live ? Math.round(sampleUsed * scale) : 0;
    const podsCapacity = live
      ? Math.round(sampleCap * scale) || nodesTotal * 110
      : 0;
    return {
      gpuTotal,
      gpuUsed,
      gpuFree,
      gpuFault,
      gpuByType: byType,
      cpuTotal,
      cpuUsed,
      memTotalGi,
      memUsedGi,
      podsUsed,
      podsCapacity,
    };
  }

  function aggregateClusterResources(clusters) {
    const acc = {
      gpuTotal: 0,
      gpuUsed: 0,
      gpuFree: 0,
      gpuFault: 0,
      gpuByType: {},
      cpuTotal: 0,
      cpuUsed: 0,
      memTotalGi: 0,
      memUsedGi: 0,
      podsUsed: 0,
      podsCapacity: 0,
    };
    (clusters || []).forEach((c) => {
      const r = clusterResourcesOf(c);
      acc.gpuTotal += r.gpuTotal;
      acc.gpuUsed += r.gpuUsed;
      acc.gpuFree += r.gpuFree;
      acc.gpuFault += r.gpuFault;
      acc.cpuTotal += r.cpuTotal;
      acc.cpuUsed += r.cpuUsed;
      acc.memTotalGi += r.memTotalGi;
      acc.memUsedGi += r.memUsedGi;
      acc.podsUsed += r.podsUsed;
      acc.podsCapacity += r.podsCapacity;
      (r.gpuByType || []).forEach((g) => {
        const key = g.gpuType || "GPU";
        if (!acc.gpuByType[key]) {
          acc.gpuByType[key] = {
            gpuType: key,
            total: 0,
            used: 0,
            free: 0,
            fault: 0,
          };
        }
        const row = acc.gpuByType[key];
        row.total += g.total || 0;
        row.used += g.used || 0;
        row.free += g.free || 0;
        row.fault += g.fault || 0;
      });
    });
    acc.gpuByType = Object.values(acc.gpuByType).sort((a, b) => (b.total || 0) - (a.total || 0));
    return acc;
  }

  function renderClusterUsageCell(used, total, opts = {}) {
    const t = Number(total) || 0;
    const u = Number(used) || 0;
    const pct = t ? Math.round((u / t) * 100) : null;
    return renderNodeRatioCell(
      { used: t ? u : null, total: t, pct, unit: opts.unit || "" },
      { label: opts.label || "用量" }
    );
  }

  function renderClusterMemCell(usedGi, totalGi) {
    const t = Number(totalGi) || 0;
    const u = Number(usedGi) || 0;
    if (t >= 1024) {
      const toTi = (n) => Math.round((n / 1024) * 10) / 10;
      return renderClusterUsageCell(toTi(u), toTi(t), { label: "内存", unit: "TiB" });
    }
    return renderClusterUsageCell(Math.round(u), Math.round(t), { label: "内存", unit: "GiB" });
  }

  function renderClusterGpuByTypeCell(r) {
    const types = (r?.gpuByType || []).filter((g) => g.total);
    if (!types.length) {
      return renderClusterUsageCell(r?.gpuUsed, r?.gpuTotal, { label: "GPU" });
    }
    return `<div class="cls-gpu-type-list">
      ${types
        .map((g) => {
          const name = shortGpuTypeLabel(g.gpuType);
          const title = `${g.gpuType} ${g.used}/${g.total} · 空闲 ${g.free} · 故障 ${g.fault}`;
          return `<div class="cls-gpu-type-row" title="${escapeHtml(title)}">
            <span class="cls-gpu-type-name">${escapeHtml(name)}</span>
            ${renderClusterUsageCell(g.used, g.total, { label: name })}
          </div>`;
        })
        .join("")}
    </div>`;
  }

  /** 堆叠条：使用 / 空闲 / 故障 */
  function resourceStackBar(used, free, fault, total) {
    const t = total || used + free + fault || 1;
    const u = Math.max(0, used);
    const f = Math.max(0, free);
    const x = Math.max(0, fault);
    const pu = (u / t) * 100;
    const pf = (f / t) * 100;
    const px = (x / t) * 100;
    return `
      <div class="dash-stack-bar" title="使用 ${u} · 空闲 ${f} · 故障 ${x}">
        <span class="dash-stack-seg is-used" style="width:${pu}%"></span>
        <span class="dash-stack-seg is-free" style="width:${pf}%"></span>
        <span class="dash-stack-seg is-fault" style="width:${px}%"></span>
      </div>`;
  }

  /* ---------- Dashboard（集群概览 · 纯资源视角） ---------- */
  function renderDashboard() {
    const s = dashboardStatsOfCurrentCluster();
    const cluster = s.cluster;
    const offline = cluster?.status === "Offline";
    const byDc = s.hasLiveResources
      ? clusterCapacityByDc(s.dcIds.length ? s.dcIds : null)
      : [];
    const byGpu = s.hasLiveResources
      ? clusterCapacityByGpuType(s.dcIds.length ? s.dcIds : null)
      : [];
    const storagePct =
      s.storageTotalTB > 0
        ? Math.round((s.storageUsedTB / s.storageTotalTB) * 100)
        : 0;
    const gpuUtilNum = parseFloat(s.gpuUtil) || 0;
    const schedReady = Math.max(0, s.nodesTotal - s.nodesIsolated - s.nodesNotReady);

    // 页头描述
    const desc = $("#dash-page-desc");
    if (desc) {
      desc.textContent = cluster
        ? `${cluster.displayName || cluster.name} · 资源水位 · 节点健康 · 卡型号与数据中心分布`
        : "当前集群资源水位 · 节点健康 · 卡型号与数据中心分布";
    }

    // —— 当前集群摘要条 ——
    const strip = $("#dash-cluster-strip");
    if (strip) {
      if (!cluster) {
        strip.innerHTML = `<div class="empty-state" style="padding:18px">尚未接入训练集群，请先在「集群管理」中接入。</div>`;
      } else {
        const dcTags = (cluster.dcs || [])
          .map((id) => dcBadge(id))
          .join("") || `<span class="text-muted">—</span>`;
        strip.innerHTML = `
          <div class="dash-cluster-main">
            <div class="dash-cluster-title-row">
              <div>
                <div class="dash-cluster-name">${escapeHtml(cluster.displayName || cluster.name)}</div>
                <div class="mono text-muted dash-cluster-id">${escapeHtml(cluster.name)}</div>
              </div>
              ${clusterStatusBadge(cluster.status)}
            </div>
          </div>
          <div class="dash-cluster-meta">
            <div class="dash-meta-item"><span class="k">版本</span><span class="v mono">${escapeHtml(cluster.version || "—")}</span></div>
            <div class="dash-meta-item"><span class="k">数据中心</span><span class="v dash-meta-dcs">${dcTags}</span></div>
          </div>
          <div class="dash-cluster-desc-wrap">
            <span class="k">描述</span>
            <p class="dash-cluster-desc text-muted">${escapeHtml(cluster.desc || "—")}</p>
          </div>`;
      }
    }

    // —— 资源总览三栏（GPU / 节点网络 / 存储，单层信息，不与 KPI 重复） ——
    // GPU 资源池：总量 + 使用率 + 使用/空闲/故障
    const poolEl = $("#dash-gpu-pool");
    if (poolEl) {
      if (!s.gpuTotal) {
        poolEl.innerHTML = `<div class="empty-state" style="padding:24px 8px">${offline ? "集群离线，暂无 GPU 资源数据" : "暂无 GPU 容量数据"}</div>`;
      } else {
        const usedPct = Math.round((s.gpuUsed / s.gpuTotal) * 100);
        const freePct = Math.round((s.gpuFree / s.gpuTotal) * 100);
        const faultPct = Math.round((s.gpuFault / s.gpuTotal) * 100);
        poolEl.innerHTML = `
          <div class="dash-pool-hero">
            <div class="dash-pool-total">
              <span class="dash-pool-num">${s.gpuTotal}</span>
              <span class="dash-pool-unit">GPU 总量</span>
            </div>
            <div class="dash-pool-util">
              <span class="dash-pool-util-val">${s.gpuUtil}%</span>
              <span class="text-muted">使用率</span>
            </div>
          </div>
          ${resourceStackBar(s.gpuUsed, s.gpuFree, s.gpuFault, s.gpuTotal)}
          <div class="dash-pool-legend">
            <div class="dash-pool-leg">
              <span class="dash-dot is-used"></span>
              <span class="k">使用中</span>
              <strong>${s.gpuUsed}</strong>
              <span class="text-muted">${usedPct}%</span>
            </div>
            <div class="dash-pool-leg">
              <span class="dash-dot is-free"></span>
              <span class="k">可调度空闲</span>
              <strong class="text-success">${s.gpuFree}</strong>
              <span class="text-muted">${freePct}%</span>
            </div>
            <div class="dash-pool-leg">
              <span class="dash-dot is-fault"></span>
              <span class="k">故障</span>
              <strong class="${s.gpuFault ? "text-danger" : ""}">${s.gpuFault}</strong>
              <span class="text-muted">${faultPct}%</span>
            </div>
          </div>`;
      }
    }

    // 节点与网络：调度构成 + IB
    const netEl = $("#dash-node-net");
    if (netEl) {
      if (!s.nodesTotal && offline) {
        netEl.innerHTML = `<div class="empty-state" style="padding:24px 8px">集群离线，暂无节点数据</div>`;
      } else {
        const nTotal = s.nodesTotal || 1;
        const readyPct = Math.round((schedReady / nTotal) * 100);
        const isoPct = Math.round((s.nodesIsolated / nTotal) * 100);
        const nrPct = Math.round((s.nodesNotReady / nTotal) * 100);
        netEl.innerHTML = `
          <div class="dash-node-summary">
            <span class="dash-node-summary-num">${s.nodesReady}</span>
            <span class="text-muted"> / ${s.nodesTotal} Ready</span>
          </div>
          <div class="dash-node-grid">
            <div class="dash-node-metric">
              <div class="dash-node-metric-val text-success">${schedReady}</div>
              <div class="dash-node-metric-label">可调度</div>
              <div class="dash-mini-bar"><span style="width:${readyPct}%;background:var(--success)"></span></div>
            </div>
            <div class="dash-node-metric">
              <div class="dash-node-metric-val" style="color:var(--warning)">${s.nodesIsolated}</div>
              <div class="dash-node-metric-label">已隔离</div>
              <div class="dash-mini-bar"><span style="width:${isoPct}%;background:var(--warning)"></span></div>
            </div>
            <div class="dash-node-metric">
              <div class="dash-node-metric-val text-danger">${s.nodesNotReady}</div>
              <div class="dash-node-metric-label">NotReady</div>
              <div class="dash-mini-bar"><span style="width:${nrPct}%;background:var(--danger)"></span></div>
            </div>
            <div class="dash-node-metric">
              <div class="dash-node-metric-val" style="color:var(--accent)">${s.ibHealthy}<span class="stat-value-unit">%</span></div>
              <div class="dash-node-metric-label">IB 健康度</div>
              <div class="dash-mini-bar"><span style="width:${Math.min(100, s.ibHealthy)}%;background:var(--accent)"></span></div>
            </div>
          </div>
          ${
            s.nodesUnsetDc
              ? `<div class="dash-node-warn" role="status" title="存在未标记数据中心的节点，可能影响调度归属，请在节点管理中补齐">
                  <span class="dash-node-warn-icon" aria-hidden="true">!</span>
                  <span>未分配数据中心 <strong>${s.nodesUnsetDc}</strong> 台</span>
                  <button type="button" class="btn btn-ghost btn-sm dash-node-warn-action" data-dash-nav="node-mgmt" data-dash-unset-dc="1">去处理</button>
                </div>`
              : ""
          }`;
      }
    }

    // 共享存储
    const storageEl = $("#dash-storage");
    if (storageEl) {
      if (!s.storageTotalTB && offline) {
        storageEl.innerHTML = `<div class="empty-state" style="padding:24px 8px">暂无存储数据</div>`;
      } else {
        const freeTB = Math.max(0, +(s.storageTotalTB - s.storageUsedTB).toFixed(1));
        storageEl.innerHTML = `
          <div class="dash-pool-hero">
            <div class="dash-pool-total">
              <span class="dash-pool-num" style="font-size:28px">${s.storageUsedTB}</span>
              <span class="dash-pool-unit">TB 已用</span>
            </div>
            <div class="dash-pool-util">
              <span class="dash-pool-util-val" style="color:var(--purple)">${storagePct}%</span>
              <span class="text-muted">使用率</span>
            </div>
          </div>
          <div class="progress" style="height:10px;border-radius:999px;overflow:hidden">
            <div class="progress-bar ${quotaBarClass(storagePct)}" style="width:${storagePct}%;border-radius:999px"></div>
          </div>
          <div class="dash-storage-meta">
            <div class="dash-pool-leg"><span class="k">总量</span><strong>${s.storageTotalTB} TB</strong></div>
            <div class="dash-pool-leg"><span class="k">剩余</span><strong class="text-success">${freeTB} TB</strong></div>
          </div>`;
      }
    }

    // 总览区导航按钮
    $$("#dash-resource-panels [data-dash-nav]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.dataset.dashUnsetDc) {
          nodeMgmtFilter.dc = "unset";
          nodeMgmtFilter.page = 1;
          nodeMgmtPageState.tab = "nodes";
        }
        if (b.dataset.dashNav) navigate(b.dataset.dashNav);
      });
    });

    // —— 数据中心资源水位 ——
    const dcWrap = $("#dash-dc-capacity");
    if (dcWrap) {
      const dcCount = (s.dcIds || []).length || byDc.length;
      const hint = offline
        ? "集群离线 · 容量数据可能未同步"
        : `覆盖 ${dcCount} 个数据中心`;

      if (!byDc.length) {
        dcWrap.innerHTML = `
          <div class="card-header">
            <h3>数据中心资源水位</h3>
            <span class="text-muted" style="font-size:12px">${hint}</span>
          </div>
          <div class="card-body">
            <div class="empty-state" style="padding:28px 16px">
              ${offline ? "当前集群离线，暂无资源水位数据。" : "当前集群暂无已配置的数据中心容量。"}
              <div class="mt-8">
                <button type="button" class="btn btn-secondary btn-sm" data-dash-nav="dc-mgmt">前往数据中心管理</button>
              </div>
            </div>
          </div>`;
      } else {
        dcWrap.innerHTML = `
          <div class="card-header">
            <h3>数据中心资源水位</h3>
            <div class="dash-dc-header-actions">
              <span class="text-muted" style="font-size:12px">${hint}</span>
              <button type="button" class="btn btn-ghost btn-sm" data-dash-nav="dc-mgmt">数据中心</button>
            </div>
          </div>
          <div class="card-body">
            <div class="dc-capacity-grid">
              ${byDc
                .map((row) => {
                  const d = findDc(row.dc);
                  const pct = row.total ? Math.round((row.used / row.total) * 100) : 0;
                  return `
                  <div class="dc-capacity-card is-clickable" style="--dc-color:${d?.color || "var(--primary)"}" data-dash-dc="${escapeHtml(row.dc)}" title="查看该数据中心节点">
                    <div class="dc-capacity-head">
                      <span class="dc-capacity-name">${escapeHtml(d?.name || row.dc)}</span>
                      ${d?.region && d.region !== "—" ? `<span class="text-muted" style="font-size:12px">${escapeHtml(d.region)}</span>` : ""}
                    </div>
                    <div class="dc-capacity-value">${row.used}<span class="text-muted"> / ${row.total}</span> <span class="dc-capacity-unit">GPU</span></div>
                    ${resourceStackBar(row.used, row.free, row.fault, row.total)}
                    <div class="dc-capacity-meta">
                      <span>空闲 <strong class="text-success">${row.free}</strong></span>
                      <span class="${row.fault ? "text-danger" : ""}">故障 ${row.fault}</span>
                      <span>${row.nodes} 节点</span>
                      <span>${pct}%</span>
                      ${row.cpuTotal ? `<span>CPU ${row.cpuTotal}</span>` : ""}
                      ${row.memTotalGi ? `<span>内存 ${formatMemGi(row.memTotalGi)}</span>` : ""}
                    </div>
                    <div class="dc-capacity-types">
                      ${(row.types || [])
                        .map(
                          (t) =>
                            `<span class="tag">${formatGpuTypeHtml(t.gpuType)} · ${t.used}/${t.total}${t.hasIB ? " · IB" : ""}</span>`
                        )
                        .join("")}
                    </div>
                  </div>`;
                })
                .join("")}
            </div>
          </div>`;
      }

      $$("#dash-dc-capacity [data-dash-nav]").forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          navigate(b.dataset.dashNav);
        })
      );
      $$("#dash-dc-capacity [data-dash-dc]").forEach((card) => {
        card.addEventListener("click", () => {
          const dc = card.dataset.dashDc;
          if (dc) {
            nodeMgmtFilter.dc = dc;
            nodeMgmtFilter.page = 1;
            nodeMgmtPageState.tab = "nodes";
          }
          navigate("node-mgmt");
          toast(`已筛选数据中心：${dcName(dc)}`);
        });
      });
    }

    // —— 卡型号分布 ——
    const typesEl = $("#dash-gpu-types");
    if (typesEl) {
      if (!byGpu.length) {
        typesEl.innerHTML = `
          <div class="card-header"><h3>卡型号分布</h3></div>
          <div class="card-body"><div class="empty-state" style="padding:24px">暂无卡型号容量数据</div></div>`;
      } else {
        typesEl.innerHTML = `
          <div class="card-header">
            <h3>卡型号分布</h3>
            <span class="text-muted" style="font-size:12px">${byGpu.length} 种型号 · 按总量排序</span>
          </div>
          <div class="card-body flush">
            <div class="table-wrap">
              <table class="table dash-gpu-type-table">
                <thead>
                  <tr>
                    <th>卡型号</th>
                    <th>总量</th>
                    <th>使用中</th>
                    <th>空闲</th>
                    <th>故障</th>
                    <th>CPU</th>
                    <th>内存</th>
                    <th>使用率</th>
                    <th>节点</th>
                    <th>网络</th>
                    <th>数据中心</th>
                  </tr>
                </thead>
                <tbody>
                  ${byGpu
                    .map((g) => {
                      const pct = g.total ? Math.round((g.used / g.total) * 100) : 0;
                      const dcList = [...(g.dcs || [])]
                        .map((id) => dcBadge(id))
                        .join(" ");
                      return `
                    <tr>
                      <td class="td-gpu-type"><strong class="gpu-type-text" title="${escapeHtml(g.gpuType)}">${formatGpuTypeHtml(g.gpuType)}</strong></td>
                      <td class="mono">${g.total}</td>
                      <td class="mono">${g.used}</td>
                      <td class="mono text-success">${g.free}</td>
                      <td class="mono ${g.fault ? "text-danger" : "text-muted"}">${g.fault}</td>
                      <td class="mono">${g.cpuTotal || "—"}</td>
                      <td class="mono">${g.memTotalGi ? formatMemGi(g.memTotalGi) : "—"}</td>
                      <td class="dash-type-util-cell">
                        <div class="dash-type-util-row">
                          <span class="mono">${pct}%</span>
                          <div class="progress" style="height:6px;flex:1;min-width:72px"><div class="progress-bar ${quotaBarClass(pct)}" style="width:${pct}%"></div></div>
                        </div>
                      </td>
                      <td class="mono">${g.nodes}</td>
                      <td>${g.hasIB ? '<span class="tag tag-ib">IB</span>' : '<span class="text-muted">无 IB</span>'}</td>
                      <td><div class="dash-meta-dcs">${dcList || "—"}</div></td>
                    </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>`;
      }
    }

    // —— 趋势图 ——
    const baseUtil = Math.min(96, Math.max(40, gpuUtilNum || 70));
    const gpuSeries = genSeries(baseUtil, 48, 6);
    const ibSeries = genSeries(Math.min(92, Math.max(35, (s.ibHealthy || 80) * 0.75)), 48, 12);
    const chartGpu = $("#dash-chart-gpu");
    const chartIb = $("#dash-chart-ib");
    if (chartGpu) {
      chartGpu.innerHTML = `
        <div class="chart-title">当前
          <span class="val">${gpuSeries[gpuSeries.length - 1].toFixed(1)} %</span>
        </div>
        ${lineChart({ values: gpuSeries, color: "#3b82f6", unit: "%", range: "1h", w: 560, h: 200 })}
        <div class="chart-axis-hint">横轴：时间 · 纵轴：利用率（%） · 悬停查看点位</div>`;
    }
    if (chartIb) {
      chartIb.innerHTML = `
        <div class="chart-title">当前
          <span class="val">${ibSeries[ibSeries.length - 1].toFixed(1)} %</span>
        </div>
        ${lineChart({ values: ibSeries, color: "#22d3ee", unit: "%", range: "1h", w: 560, h: 200 })}
        <div class="chart-axis-hint">横轴：时间 · 纵轴：带宽利用率（%） · 悬停查看点位</div>`;
    }
    bindCharts($("#page-dashboard"));
  }

  /* ---------- Jobs List ---------- */
  function jobProgressPercent(j) {
    if (j.maxSteps != null && j.maxSteps > 0 && j.currentStep != null) {
      return Math.min(100, Math.floor((j.currentStep / j.maxSteps) * 100));
    }
    return j.progress != null ? j.progress : null;
  }

  function formatStepNum(n) {
    if (n == null || Number.isNaN(+n)) return "—";
    return String(Math.floor(+n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /** Loss 列：最近一次 train loss；未上报显示 — */
  function renderJobLossCell(j) {
    if (j.status === "queued" || j.status === "starting") {
      return `<span class="text-muted">—</span>`;
    }
    if (j.loss == null || Number.isNaN(+j.loss)) {
      return `<span class="text-muted">—</span>`;
    }
    const n = +j.loss;
    const text = n >= 10 ? n.toFixed(2) : n.toFixed(3);
    const cls =
      j.status === "failed" ? "job-loss is-failed" : j.status === "success" ? "job-loss is-done" : "job-loss";
    return `<span class="${cls} mono" title="最近上报的 train loss">${text}</span>`;
  }

  /** 进度列：百分比 + 条 + step x/y（对齐 current_step / max_steps） */
  function renderJobProgressCell(j) {
    if (j.status === "queued" || j.status === "starting") {
      return `<span class="text-muted">—</span>`;
    }

    const hasDenom = j.maxSteps != null && j.maxSteps > 0;
    const hasStep = j.currentStep != null;
    const percent = jobProgressPercent(j);

    // 无任何进度信息
    if (percent == null && !hasStep) {
      return `<span class="text-muted">—</span>`;
    }

    const barMod =
      j.status === "success" ? "success" : j.status === "failed" ? "danger" : j.status === "cancelled" ? "warn" : "";

    const stepLine = hasDenom
      ? `step ${formatStepNum(j.currentStep ?? 0)}/${formatStepNum(j.maxSteps)}`
      : hasStep
      ? `step ${formatStepNum(j.currentStep)}`
      : "";

    // 仅有 step、尚无百分比时（极少）
    if (percent == null) {
      return `<div class="job-progress">
        <div class="job-progress-step mono">${stepLine}</div>
      </div>`;
    }

    return `<div class="job-progress">
      <div class="job-progress-top">
        <span class="job-progress-pct">${percent}%</span>
      </div>
      <div class="progress"><div class="progress-bar ${barMod}" style="width:${percent}%"></div></div>
      ${stepLine ? `<div class="job-progress-step mono">${stepLine}</div>` : ""}
    </div>`;
  }

  const jobListState = { page: 1, pageSize: 10, teamId: "all", queueId: "all", priority: "all" };

  /**
   * 任务优先级（4 级）：用于同队列多任务排队时的调度排序
   * P0 最高 → P3 最低
   */
  const JOB_PRIORITY_DEFS = [
    { id: "P0", label: "最高", desc: "紧急 / 线上关键", order: 0 },
    { id: "P1", label: "高", desc: "重要训练", order: 1 },
    { id: "P2", label: "中", desc: "常规任务", order: 2 },
    { id: "P3", label: "低", desc: "调试 / 可后置", order: 3 },
  ];

  function normalizeJobPriority(p) {
    const id = String(p || "P2").toUpperCase();
    return JOB_PRIORITY_DEFS.some((d) => d.id === id) ? id : "P2";
  }

  function jobPriorityDef(p) {
    const id = normalizeJobPriority(p);
    return JOB_PRIORITY_DEFS.find((d) => d.id === id) || JOB_PRIORITY_DEFS[2];
  }

  function renderJobPriorityBadge(p) {
    const def = jobPriorityDef(p);
    return `<span class="priority-badge priority-${def.id.toLowerCase()}" title="优先级 ${def.id} · ${def.label}：${def.desc}">${def.id}<span class="priority-badge-label">${def.label}</span></span>`;
  }

  function getCreatePriority() {
    const checked = document.querySelector('input[name="create-priority"]:checked');
    return normalizeJobPriority(checked?.value || "P2");
  }

  function setCreatePriority(p) {
    const id = normalizeJobPriority(p);
    const input = document.querySelector(`input[name="create-priority"][value="${id}"]`);
    if (input) input.checked = true;
    syncCreatePriorityUi();
  }

  function syncCreatePriorityUi() {
    $$("#create-priority .job-priority-option").forEach((lab) => {
      const on = !!lab.querySelector('input[type="radio"]')?.checked;
      lab.classList.toggle("is-selected", on);
    });
  }

  const PAGE_SIZE_OPTIONS = [10, 20, 50];

  /** 通用分页条 */
  function renderPager({ total, page, pageSize, key }) {
    const ps = pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / ps));
    let p = page || 1;
    if (p > totalPages) p = totalPages;
    if (p < 1) p = 1;
    const from = total === 0 ? 0 : (p - 1) * ps + 1;
    const to = Math.min(total, p * ps);
    let start = Math.max(1, p - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    const nums = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return `
      <div class="alert-pagination" data-pager-key="${key}">
        <div class="alert-page-info text-muted">
          共 <strong style="color:var(--text-1)">${total}</strong> 条
          · 显示 ${from}–${to}
          · 每页
          <select class="alert-page-size" data-pager-size="${key}">
            ${PAGE_SIZE_OPTIONS.map(
              (n) => `<option value="${n}" ${n === ps ? "selected" : ""}>${n}</option>`
            ).join("")}
          </select>
          条
        </div>
        <div class="alert-page-btns">
          <button type="button" class="alert-page-btn" data-pager="${key}" data-page="prev" ${p <= 1 ? "disabled" : ""}>上一页</button>
          ${nums
            .map(
              (n) =>
                `<button type="button" class="alert-page-btn ${n === p ? "active" : ""}" data-pager="${key}" data-page="${n}">${n}</button>`
            )
            .join("")}
          <button type="button" class="alert-page-btn" data-pager="${key}" data-page="next" ${p >= totalPages ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
  }

  function bindPager(key, getState, setPage, setPageSize, rerender) {
    $$(`[data-pager="${key}"]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const st = getState();
        const totalPages = Math.max(1, Math.ceil(st.total / st.pageSize));
        const k = btn.dataset.page;
        if (k === "prev") setPage(Math.max(1, st.page - 1));
        else if (k === "next") setPage(Math.min(totalPages, st.page + 1));
        else setPage(+k || 1);
        rerender();
      });
    });
    $$(`[data-pager-size="${key}"]`).forEach((sel) => {
      sel.addEventListener("change", (e) => {
        setPageSize(+e.target.value || 10);
        setPage(1);
        rerender();
      });
    });
  }

  /** 同步任务列表：团队 / 队列筛选项（选项来自当前任务与平台配置） */
  function syncJobFilterOptions() {
    const teamSel = $("#job-filter-team");
    const queueSel = $("#job-filter-queue");
    if (!teamSel || !queueSel) return;

    const teamIds = new Set();
    const queueKeys = new Map(); // id -> { id, name, display }

    (MOCK.teams || []).forEach((t) => teamIds.add(t.id));
    (MOCK.queues || []).forEach((q) => {
      queueKeys.set(q.id, { id: q.id, name: q.name, label: q.displayName || q.name });
    });
    (MOCK.jobs || []).forEach((j) => {
      if (j.teamId) teamIds.add(j.teamId);
      if (j.queueId || j.queue) {
        const q = findQueue(j.queueId || j.queue);
        const id = q?.id || j.queueId || j.queue;
        if (id && !queueKeys.has(id)) {
          queueKeys.set(id, {
            id,
            name: j.queue || id,
            label: q?.displayName || j.queue || id,
          });
        }
      }
    });

    // 团队选项
    const teamOpts = [`<option value="all">全部团队</option>`];
    [...teamIds]
      .map((id) => findTeam(id) || { id, name: id })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh"))
      .forEach((t) => {
        teamOpts.push(`<option value="${t.id}">${escapeHtml(t.name || t.id)}</option>`);
      });
    // 任务上有 teamName 但无 teamId 的兜底（少见）
    const orphanTeamNames = [
      ...new Set(
        (MOCK.jobs || [])
          .filter((j) => !j.teamId && j.teamName)
          .map((j) => j.teamName)
      ),
    ];
    orphanTeamNames.forEach((name) => {
      teamOpts.push(
        `<option value="name:${String(name).replace(/"/g, "&quot;")}">${escapeHtml(name)}</option>`
      );
    });

    const prevTeam = jobListState.teamId || "all";
    teamSel.innerHTML = teamOpts.join("");
    if ([...teamSel.options].some((o) => o.value === prevTeam)) teamSel.value = prevTeam;
    else {
      teamSel.value = "all";
      jobListState.teamId = "all";
    }

    // 队列选项：若选了团队，仅展示该团队关联队列 + 该团队任务用过的队列
    const teamFilter = teamSel.value || "all";
    let queueList = [...queueKeys.values()];
    if (teamFilter !== "all" && !String(teamFilter).startsWith("name:")) {
      const team = findTeam(teamFilter);
      const allowed = new Set(team?.queueIds || []);
      (MOCK.jobs || [])
        .filter((j) => j.teamId === teamFilter)
        .forEach((j) => {
          const q = findQueue(j.queueId || j.queue);
          if (q) allowed.add(q.id);
          else if (j.queueId) allowed.add(j.queueId);
        });
      if (allowed.size) {
        queueList = queueList.filter((q) => allowed.has(q.id));
      }
    }

    const queueOpts = [`<option value="all">全部队列</option>`];
    queueList
      .sort((a, b) => (a.label || "").localeCompare(b.label || "", "zh"))
      .forEach((q) => {
        queueOpts.push(`<option value="${q.id}">${escapeHtml(q.label)} · ${escapeHtml(q.name)}</option>`);
      });

    const prevQueue = jobListState.queueId || "all";
    queueSel.innerHTML = queueOpts.join("");
    if ([...queueSel.options].some((o) => o.value === prevQueue)) queueSel.value = prevQueue;
    else {
      queueSel.value = "all";
      jobListState.queueId = "all";
    }
  }

  function jobMatchesTeamFilter(j, teamFilter) {
    if (!teamFilter || teamFilter === "all") return true;
    if (String(teamFilter).startsWith("name:")) {
      return j.teamName === teamFilter.slice(5);
    }
    return j.teamId === teamFilter || findTeam(teamFilter)?.name === j.teamName;
  }

  function jobMatchesQueueFilter(j, queueFilter) {
    if (!queueFilter || queueFilter === "all") return true;
    const q = findQueue(queueFilter);
    if (q) return j.queueId === q.id || j.queue === q.name;
    return j.queueId === queueFilter || j.queue === queueFilter;
  }

  function renderJobs() {
    syncJobFilterOptions();

    const statusFilter = $("#job-filter-status")?.value || "all";
    const teamFilter = $("#job-filter-team")?.value || jobListState.teamId || "all";
    const queueFilter = $("#job-filter-queue")?.value || jobListState.queueId || "all";
    const priorityFilter = $("#job-filter-priority")?.value || jobListState.priority || "all";
    const q = ($("#job-search")?.value || "").toLowerCase();

    jobListState.teamId = teamFilter;
    jobListState.queueId = queueFilter;
    jobListState.priority = priorityFilter;

    let list = MOCK.jobs;
    if (statusFilter !== "all") list = list.filter((j) => j.status === statusFilter);
    if (teamFilter !== "all") list = list.filter((j) => jobMatchesTeamFilter(j, teamFilter));
    if (queueFilter !== "all") list = list.filter((j) => jobMatchesQueueFilter(j, queueFilter));
    if (priorityFilter !== "all") {
      list = list.filter((j) => normalizeJobPriority(j.priority) === priorityFilter);
    }
    if (q) {
      list = list.filter((j) => {
        const queueObj = findQueue(j.queueId || j.queue);
        const queueLabel = (queueObj?.displayName || queueObj?.name || j.queue || "").toLowerCase();
        return (
          j.name.toLowerCase().includes(q) ||
          j.id.includes(q) ||
          j.owner.includes(q) ||
          (j.ownerUsername || "").toLowerCase().includes(q) ||
          (j.teamName || "").toLowerCase().includes(q) ||
          queueLabel.includes(q) ||
          (j.queue || "").toLowerCase().includes(q) ||
          normalizeJobPriority(j.priority).toLowerCase().includes(q)
        );
      });
    }

    // 排队中任务按优先级排序展示（P0 优先），其余保持相对稳定
    list = list.slice().sort((a, b) => {
      const aq = a.status === "queued" ? 0 : 1;
      const bq = b.status === "queued" ? 0 : 1;
      if (aq !== bq) return aq - bq;
      if (a.status === "queued" && b.status === "queued") {
        const pa = jobPriorityDef(a.priority).order;
        const pb = jobPriorityDef(b.priority).order;
        if (pa !== pb) return pa - pb;
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      }
      return 0;
    });

    const total = list.length;
    const pageSize = jobListState.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (jobListState.page > totalPages) jobListState.page = totalPages;
    if (jobListState.page < 1) jobListState.page = 1;
    const start = (jobListState.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    $("#jobs-tbody").innerHTML = pageList.length
      ? pageList
          .map((j) => {
            const canStop =
              j.status === "running" || j.status === "queued" || j.status === "starting";
            // 停止 / 重跑互斥
            const lifecycleBtn = canStop
              ? `<button type="button" class="btn btn-danger btn-sm" data-cancel="${j.id}" title="停止该任务">停止</button>`
              : `<button type="button" class="btn btn-secondary btn-sm" data-recreate="${j.id}" title="基于当前配置重跑">重跑</button>`;
            const queueObj = findQueue(j.queueId || j.queue);
            const queueLabel = queueObj?.displayName || queueObj?.name || j.queue || "—";
            return `
      <tr>
        <td>
          <div class="link-cell" data-job="${j.id}">${escapeHtml(j.name)}</div>
          <div class="mono text-muted" style="font-size:11px;margin-top:2px">${escapeHtml(j.id)}</div>
        </td>
        <td>${jobStatusBadge(j)}</td>
        <td>${renderJobPriorityBadge(j.priority)}</td>
        <td class="td-team-queue">
          <div style="font-size:12.5px">${escapeHtml(j.teamName || "—")}</div>
          <div class="text-muted" style="font-size:12px;margin-top:2px" title="${escapeHtml(queueObj?.name || j.queue || "")}">${escapeHtml(queueLabel)}</div>
        </td>
        <td class="td-nowrap">${dcBadge(j.dc)}</td>
        <td class="td-job-res">${renderJobResourceCell(j, {
          extraSub: j.requireIB
            ? `<span class="tag tag-ib" title="使用 InfiniBand 高速网络">IB</span>`
            : "",
        })}</td>
        <td class="mono td-nowrap">${j.duration}</td>
        <td class="td-nowrap">${j.owner}</td>
        <td class="mono text-muted td-created">${formatCreatedAtCell(j.createdAt)}</td>
        <td class="td-actions">
          <div class="job-actions">
            ${lifecycleBtn}
          </div>
        </td>
      </tr>`;
          })
          .join("")
      : `<tr><td colspan="10"><div class="empty-state">没有匹配的任务</div></td></tr>`;

    const pagerEl = $("#jobs-pagination");
    if (pagerEl) {
      pagerEl.innerHTML = renderPager({
        total,
        page: jobListState.page,
        pageSize,
        key: "jobs",
      });
    }

    bindJobLinks();
    $$("[data-cancel]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openStopJobConfirm(btn.dataset.cancel);
      })
    );
    $$("[data-recreate]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        goRerunJob(btn.dataset.recreate);
      })
    );
    bindPager(
      "jobs",
      () => ({ page: jobListState.page, pageSize: jobListState.pageSize, total }),
      (p) => {
        jobListState.page = p;
      },
      (s) => {
        jobListState.pageSize = s;
      },
      renderJobs
    );
  }

  function bindJobLinks() {
    $$("[data-job]").forEach((el) => {
      el.addEventListener("click", () => {
        currentJobId = el.dataset.job;
        navigate("job-detail");
      });
    });
  }

  function bindExpLinks(root = document) {
    $$("[data-exp]", root).forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = el.dataset.exp;
        if (id) goExpDetail(id);
      });
    });
  }

  function usernameForJob(job) {
    if (job?.ownerUsername) return job.ownerUsername;
    const hit = (MOCK.ldapUsers || []).find((u) => u.name === job?.owner);
    if (hit?.username) return hit.username;
    return (MOCK.user && MOCK.user.username) || "user";
  }

  /** 任务输出目录下的 TensorBoard logdir 约定路径 */
  function tbLogdirPathForJob(job) {
    return `/data/hpc/home/${usernameForJob(job)}/outputs/${job.id}/tensorboard`;
  }

  function ensureJobExperimentLink(job, projectId) {
    const existing = findExperimentsByJob(job.id);
    if (existing.length) return existing[0];
    const proj =
      findProject(projectId) ||
      activeProjects()[0] ||
      (MOCK.experimentProjects || [])[0];
    if (!proj) return null;
    const exp = {
      id: `exp-${job.id.replace(/^job-/, "")}`,
      name: job.name,
      projectId: proj.id,
      project: proj.name,
      status: job.status === "success" ? "finished" : job.status === "failed" ? "failed" : job.status === "cancelled" ? "crashed" : "running",
      owner: job.owner,
      jobId: job.id,
      tags: ["auto-linked"],
      createdAt: job.createdAt || job.startedAt,
      updatedAt: job.createdAt || job.startedAt,
      duration: job.duration || "-",
      framework: job.framework || "—",
      gpus: job.gpus,
      notes: `由训练任务 ${job.id} 自动关联创建`,
      tbLogdir: tbLogdirPathForJob(job),
      summary: {
        train_loss: job.loss,
        val_loss: null,
        best_val_loss: null,
        lr: null,
        tokens_per_sec: null,
        grad_norm: null,
        step: job.currentStep,
        max_steps: job.maxSteps,
        epoch: null,
      },
      config: { model: "—", linked_from: "training_job" },
      metrics: { steps: [], train_loss: [], val_loss: [], lr: [], tokens_per_sec: [], grad_norm: [], gpu_mem_gb: [] },
      artifacts: [],
    };
    MOCK.experiments.unshift(exp);
    return exp;
  }

  /* ---------- 我的队列（训练中心 · 用户侧额度 · 列表布局） ---------- */
  function renderMyQueues() {
    const items = queuesForCurrentUser();
    const summaryEl = $("#my-queues-summary");
    const bodyEl = $("#my-queues-body");

    const totalGpuQuota = items.reduce((s, x) => s + (x.queue.gpuQuota || 0), 0);
    const totalGpuUsed = items.reduce((s, x) => s + (x.queue.gpuUsed || 0), 0);
    const totalGpuFree = Math.max(0, totalGpuQuota - totalGpuUsed);
    const totalCpuQuota = items.reduce((s, x) => s + (x.queue.cpuQuota || 0), 0);
    const totalCpuUsed = items.reduce((s, x) => s + (x.queue.cpuUsed || 0), 0);
    const totalCpuFree = Math.max(0, totalCpuQuota - totalCpuUsed);
    const totalMemQuota = items.reduce((s, x) => s + (x.queue.memQuotaGi || 0), 0);
    const totalMemUsed = items.reduce((s, x) => s + (x.queue.memUsedGi || 0), 0);
    const totalMemFree = Math.max(0, totalMemQuota - totalMemUsed);
    let runningJobCount = 0;
    let queuedJobCount = 0;
    let totalGpuHoursMonth = 0;
    let runningGpuHours = 0;
    items.forEach((x) => {
      totalGpuHoursMonth += queueGpuHoursMonth(x.queue);
      activeJobsForQueue(x.queue.id).forEach((j) => {
        if (j.status === "queued") queuedJobCount += 1;
        else if (j.status === "running" || j.status === "starting") {
          runningJobCount += 1;
          runningGpuHours += jobGpuHours(j);
        }
      });
    });
    const activeJobCount = runningJobCount + queuedJobCount;

    // 顶栏：GPU / CPU / 内存剩余额度 + 本月卡时 + 活跃任务
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="stats-grid stats-grid-5 my-queues-stats">
          <div class="stat-card" style="--stat-color: var(--success)">
            <div class="stat-label">剩余 GPU</div>
            <div class="stat-value ${totalGpuFree === 0 ? "text-danger" : "text-success"}">${totalGpuFree}</div>
            <div class="stat-meta">已用 ${totalGpuUsed} / ${totalGpuQuota} 卡</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--primary)">
            <div class="stat-label">剩余 CPU</div>
            <div class="stat-value ${totalCpuFree === 0 && totalCpuQuota ? "text-danger" : ""}">${totalCpuFree}</div>
            <div class="stat-meta">已用 ${totalCpuUsed} / ${totalCpuQuota} 核</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--purple)">
            <div class="stat-label">剩余内存</div>
            <div class="stat-value ${totalMemFree === 0 && totalMemQuota ? "text-danger" : ""}">${totalMemFree}</div>
            <div class="stat-meta">已用 ${totalMemUsed} / ${totalMemQuota} Gi</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--accent)" title="卡时 = GPU 数 × 运行时长，后续可用于训练任务成本核算">
            <div class="stat-label">本月卡时</div>
            <div class="stat-value">${formatGpuHours(totalGpuHoursMonth, { unit: false })}</div>
            <div class="stat-meta">运行中 ${formatGpuHours(runningGpuHours, { unit: false })} · 可核算成本</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--warning)">
            <div class="stat-label">活跃任务</div>
            <div class="stat-value">${activeJobCount}</div>
            <div class="stat-meta">运行 ${runningJobCount} · 排队 ${queuedJobCount}</div>
          </div>
        </div>`;
    }

    if (!bodyEl) return;

    if (!items.length) {
      bodyEl.innerHTML = `
        <div class="empty-state" style="padding:48px 24px">
          当前账号未关联任何资源队列。<br/>
          <span class="text-muted" style="font-size:12.5px">请联系管理员将你加入团队，并在团队中绑定队列。</span>
        </div>`;
      return;
    }

    // 列表布局：队列主行 + 其下缩进展示运行/排队任务
    const COLS = 10;
    bodyEl.innerHTML = `<div class="table-wrap"><table class="table my-queues-table">
      <colgroup>
        <col class="mq-col-name" />
        <col class="mq-col-team" />
        <col class="mq-col-dc" />
        <col class="mq-col-gpu" />
        <col class="mq-col-quota" />
        <col class="mq-col-hours" />
        <col class="mq-col-cpu" />
        <col class="mq-col-feat" />
        <col class="mq-col-active" />
        <col class="mq-col-act" />
      </colgroup>
      <thead><tr>
        <th>队列</th>
        <th>团队</th>
        <th>数据中心</th>
        <th>GPU</th>
        <th>GPU 额度</th>
        <th title="卡时 = GPU 数 × 运行时长，后续可用于训练任务成本核算">本月卡时</th>
        <th>CPU / 内存</th>
        <th>功能特性</th>
        <th title="运行中 / 排队中">运行/排队</th>
        <th class="th-actions">操作</th>
      </tr></thead>
      <tbody>
        ${items
          .map(({ queue: q, teams: tNames }) => {
            const gpuFree = queueGpuFree(q);
            const gpuPct = queueUtilPct(q);
            const cpuFree = queueCpuFree(q);
            const memFree = queueMemFree(q);
            const actJobs = activeJobsForQueue(q.id);
            // 运行 / 启动中优先，再排队
            const statusRank = { running: 0, starting: 1, queued: 2 };
            const sortedJobs = [...actJobs].sort(
              (a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)
            );
            const runningJobs = actJobs.filter(
              (j) => j.status === "running" || j.status === "starting"
            );
            const queuedJobs = actJobs.filter((j) => j.status === "queued");
            const enabled = isQueueEnabled(q);
            const monthHours = queueGpuHoursMonth(q);
            const runningHours = runningJobs.reduce((s, j) => s + jobGpuHours(j), 0);
            const jobNestRows =
              sortedJobs.length > 0
                ? `
              <tr class="my-queue-job-row">
                <td colspan="${COLS}">
                  <div class="my-queue-job-nest">
                    ${sortedJobs
                      .map((j) => {
                        const hours = jobGpuHours(j);
                        const hoursText =
                          j.status === "queued"
                            ? "—"
                            : formatGpuHours(hours);
                        const hoursTitle =
                          j.status === "queued"
                            ? "排队中，尚未计费卡时"
                            : `卡时 = ${j.gpus || 0} 卡 × ${escapeHtml(j.duration || "—")}，后续可用于成本核算`;
                        return `
                      <div class="my-queue-job-item">
                        <span class="my-queue-job-rail" aria-hidden="true"></span>
                        <span class="link-cell my-queue-job-name" data-job="${j.id}" title="${escapeHtml(j.name)}">${escapeHtml(j.name)}</span>
                        <span class="my-queue-job-status">${jobStatusBadge(j)}</span>
                        <span class="my-queue-job-meta" title="${escapeHtml(`${j.gpus || 0} 卡 · ${j.gpuType || q.gpuType || ""} · CPU ${jobResourcesOf(j).cpus} · ${formatMemGi(jobResourcesOf(j).memGi)}`)}">${j.gpus || 0} 卡 · ${escapeHtml(j.gpuType || q.gpuType || "")} · CPU ${jobResourcesOf(j).cpus} · ${formatMemGi(jobResourcesOf(j).memGi)}</span>
                        <span class="my-queue-job-hours" title="${hoursTitle}">${hoursText}</span>
                        <span class="my-queue-job-owner">${escapeHtml(j.owner || "—")}</span>
                      </div>`;
                      })
                      .join("")}
                  </div>
                </td>
              </tr>`
                : "";
            return `
          <tr class="my-queue-row ${enabled ? "" : "is-disabled-row"}${sortedJobs.length ? " has-jobs" : ""}">
            <td class="my-queue-name-cell" title="${escapeHtml((q.displayName || q.name) + (q.displayName && q.name ? ` · ${q.name}` : ""))}">
              <strong>${escapeHtml(q.displayName || q.name)}</strong>
            </td>
            <td class="my-queue-team-cell">${
              tNames.length
                ? tNames.map((n) => `<span class="tag tag-soft">${escapeHtml(n)}</span>`).join("")
                : '<span class="text-muted">—</span>'
            }</td>
            <td>${dcBadge(q.dc)}</td>
            <td class="my-queue-gpu-type">${escapeHtml(q.gpuType || "—")}</td>
            <td class="my-queue-gpu-cell">
              <div class="my-queue-quota-line">${q.gpuUsed || 0}/${q.gpuQuota || 0} · 余 <strong class="${gpuFree ? "text-success" : "text-danger"}">${gpuFree}</strong></div>
              <div class="progress mt-8" style="height:6px"><div class="progress-bar ${quotaBarClass(gpuPct)}" style="width:${gpuPct}%"></div></div>
            </td>
            <td class="my-queue-hours-cell" title="${runningHours > 0 ? `本月累计 ${formatGpuHours(monthHours)} · 运行中 ${formatGpuHours(runningHours)}` : `本月累计 ${formatGpuHours(monthHours)}，后续可用于训练任务成本核算`}">
              <div class="my-queue-hours-line"><strong>${formatGpuHours(monthHours, { unit: false })}</strong> <span class="text-muted">卡时</span></div>
            </td>
            <td class="my-queue-cpu-mem-cell mono" title="CPU ${q.cpuUsed || 0}/${q.cpuQuota || 0} · 余 ${cpuFree} 核 · 内存 ${q.memUsedGi || 0}/${q.memQuotaGi || 0} Gi · 余 ${memFree} Gi">
              <div class="my-queue-cpu-line">CPU ${q.cpuUsed || 0}/${q.cpuQuota || 0}</div>
              <div class="my-queue-mem-line">${formatMemPair(q.memUsedGi, q.memQuotaGi)}</div>
            </td>
            <td>${renderQueueFeatureTags(q)}</td>
            <td class="my-queue-active-cell" title="运行 ${runningJobs.length} · 排队 ${queuedJobs.length || q.pending || 0}">
              ${runningJobs.length}<span class="text-muted"> / ${queuedJobs.length || q.pending || 0}</span>
            </td>
            <td class="td-actions">
              <div class="job-actions">
                <button type="button" class="btn btn-primary btn-sm" data-use-queue="${q.id}" ${gpuFree === 0 ? 'title="GPU 额度已满，提交后可能排队"' : ""}>提交</button>
                <button type="button" class="btn btn-ghost btn-sm" data-q-jobs="${escapeHtml(q.name)}">任务</button>
              </div>
            </td>
          </tr>
          ${jobNestRows}`;
          })
          .join("")}
      </tbody>
    </table></div>`;

    bindJobLinks();
    $$("[data-use-queue]").forEach((b) =>
      b.addEventListener("click", () => {
        const q = findQueue(b.dataset.useQueue);
        if (!q) return;
        const userTeams = teamsForCurrentUser().filter((t) =>
          (t.queueIds || []).includes(q.id)
        );
        const teamId = userTeams[0]?.id || CREATE_DEFAULTS.teamId;
        goCreateJob();
        setTimeout(() => {
          populateCreateTeamOptions(teamId);
          populateCreateQueueOptions(teamId, q.id);
          syncCreateFromQueue();
          updateCreateSummary();
          toast(`已选择队列：${q.displayName || q.name}`);
        }, 50);
      })
    );
    $$("[data-q-jobs]").forEach((b) =>
      b.addEventListener("click", () => {
        const q = findQueue(b.dataset.qJobs);
        jobListState.queueId = q?.id || b.dataset.qJobs || "all";
        jobListState.teamId = "all";
        jobListState.page = 1;
        navigate("jobs");
        toast(`已按队列筛选: ${q?.displayName || b.dataset.qJobs}`);
      })
    );
  }

  /* ---------- ConfigSet 管理 ---------- */
  function findConfigSet(idOrName) {
    if (!idOrName) return null;
    return (MOCK.configSets || []).find((s) => s.id === idOrName || s.name === idOrName) || null;
  }

  /** 由显示名称生成内部 name / id（页面不再暴露配置集标识） */
  function makeConfigSetKeys(displayName) {
    const slug = String(displayName || "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const base = slug || `config-${Date.now().toString(36)}`;
    const used = new Set((MOCK.configSets || []).flatMap((s) => [s.id, s.name].filter(Boolean)));
    let name = base;
    let n = 2;
    while (used.has(name) || used.has(`cfg-${name}`)) {
      name = `${base}-${n++}`;
    }
    return { name, id: `cfg-${name}` };
  }

  function isConfigDisplayNameTaken(displayName, teamId, exceptId) {
    const n = String(displayName || "").trim();
    if (!n) return false;
    return (MOCK.configSets || []).some(
      (s) => s.displayName === n && s.teamId === teamId && s.id !== exceptId
    );
  }

  function configFrameworkLabel(fw) {
    return ({ megatron: "Megatron", nemo: "NeMo", accelerate: "Accelerate", custom: "自定义" }[fw] || fw || "自定义");
  }

  function latestConfigVersion(set) {
    if (!set?.versions?.length) return null;
    return [...set.versions].sort((a, b) => b.version - a.version)[0];
  }

  /** 当前登录用户在该配置集上的未发布个人草稿（每用户每 Set 一份） */
  function ownConfigDraft(set) {
    const d = set?.draft;
    if (!d) return null;
    const me = MOCK.user;
    if (!me) return null;
    if (d.ownerUsername && me.username && d.ownerUsername === me.username) return d;
    if (d.owner && me.name && d.owner === me.name) return d;
    return null;
  }

  function findConfigVersion(set, ver) {
    if (!set) return null;
    if (ver == null || ver === "latest") return latestConfigVersion(set);
    return (set.versions || []).find((v) => Number(v.version) === Number(ver)) || null;
  }

  const CONFIG_FILE_MAX_BYTES = 50 * 1024;
  const CONFIG_FILE_MAX_LABEL = "50 KB";

  function configFileBytes(file) {
    if (!file) return 0;
    if (typeof file.size === "number") return file.size;
    try {
      return new Blob([file.content || ""]).size;
    } catch (e) {
      return String(file.content || "").length;
    }
  }

  function configFileOverLimit(file) {
    return configFileBytes(file) > CONFIG_FILE_MAX_BYTES;
  }

  function oversizedConfigFiles(files) {
    return (files || []).filter(configFileOverLimit);
  }

  function assertConfigFilesWithinLimit() {
    const over = oversizedConfigFiles(configEditor?.files);
    if (!over.length) return true;
    const f = over[0];
    focusConfigEditIssue(
      "files",
      `${f.path} 为 ${formatBytes(configFileBytes(f))}，每个配置文件不能超过 ${CONFIG_FILE_MAX_LABEL}`
    );
    return false;
  }

  function renderConfigFileSizeBadge(file) {
    const bytes = configFileBytes(file);
    const over = bytes > CONFIG_FILE_MAX_BYTES;
    return `<span class="cfg-file-size${over ? " is-over" : ""}" id="cfg-file-size" title="每个配置文件不超过 ${CONFIG_FILE_MAX_LABEL}">${formatBytes(bytes)} / ${CONFIG_FILE_MAX_LABEL}</span>`;
  }

  function updateConfigFileSizeBadge() {
    const el = $("#cfg-file-size");
    if (!el || !configEditor) return;
    const ta = $("#cfg-file-content");
    const active =
      configEditor.files.find((f) => f.path === configEditor.activePath) || configEditor.files[0];
    if (active && ta) active.content = ta.value;
    const bytes = configFileBytes(active);
    const over = bytes > CONFIG_FILE_MAX_BYTES;
    el.textContent = `${formatBytes(bytes)} / ${CONFIG_FILE_MAX_LABEL}`;
    el.classList.toggle("is-over", over);
    el.title = over
      ? `已超过上限 ${CONFIG_FILE_MAX_LABEL}`
      : `每个配置文件不超过 ${CONFIG_FILE_MAX_LABEL}`;
    const item = active
      ? $$("[data-cfg-file]").find((el) => el.dataset.cfgFile === active.path)
      : null;
    if (item) {
      item.classList.toggle("is-over", over);
      let tag = item.querySelector(".cfg-file-over");
      if (over && !tag) {
        tag = document.createElement("span");
        tag.className = "cfg-file-over";
        tag.textContent = "超限";
        item.appendChild(tag);
      } else if (!over && tag) {
        tag.remove();
      }
    }
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v < 1024) return `${v} B`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
    return `${(v / (1024 * 1024)).toFixed(2)} MB`;
  }

  function configFileLangLabel(path) {
    const lang = langFromPath(path);
    return ({ yaml: "YAML", json: "JSON", shell: "SHELL", env: "ENV" }[lang] || "TEXT");
  }

  function configVersionBytes(ver) {
    return (ver?.files || []).reduce((s, f) => s + configFileBytes(f), 0);
  }

  function canSeeConfigSet(set) {
    if (!set) return false;
    if (isPlatformAdmin()) return true;
    if (set.owner === MOCK.user?.name) return true;
    if (set.visibility === "private") return false;
    return teamsForCurrentUser().some((t) => t.id === set.teamId);
  }

  function visibleConfigSets() {
    return (MOCK.configSets || []).filter(canSeeConfigSet);
  }

  function cloneConfigFiles(files) {
    return (files || []).map((f) => ({ path: f.path, kind: "config", content: f.content || "" }));
  }

  function mockDigest(files) {
    const payload = (files || [])
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => `${f.path}\n${f.kind}\n${f.content || ""}`)
      .join("\n--\n");
    let h = 2166136261;
    for (let i = 0; i < payload.length; i++) {
      h ^= payload.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0") + payload.length.toString(16).padStart(8, "0");
  }

  function nowStamp() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  function mountPathsConflict(a, b) {
    const na = String(a || "").replace(/\/+$/, "") || "/";
    const nb = String(b || "").replace(/\/+$/, "") || "/";
    return na === nb || na.startsWith(`${nb}/`) || nb.startsWith(`${na}/`);
  }

  function isLocalAdminUsername(username) {
    const adminUid = String(MOCK.platformAdmin?.username || "admin").toLowerCase();
    return String(username || "").trim().toLowerCase() === adminUid;
  }

  /** 可被指定为任务运行身份：平台已接入且启用的 LDAP 用户，排除本地 admin */
  function runUserCandidates() {
    return activePlatformUsers().filter((u) => !isLocalAdminUsername(u.username));
  }

  function findRunUserCandidate(username) {
    const uid = String(username || "").trim().toLowerCase();
    if (!uid) return null;
    return runUserCandidates().find((x) => String(x.username || "").toLowerCase() === uid) || null;
  }

  function runUserFromJob(job) {
    if (!job) return null;
    return (
      findRunUserCandidate(job.ownerUsername) ||
      runUserCandidates().find((u) => u.name === job.owner) ||
      null
    );
  }

  function currentLoginAsRunUser() {
    const uid = MOCK.user?.username;
    const hit =
      findRunUserCandidate(uid) ||
      (MOCK.ldapUsers || []).find((u) => u.username === uid) ||
      null;
    if (hit) return hit;
    return {
      username: MOCK.user?.username || "user",
      name: MOCK.user?.name || MOCK.user?.username || "user",
    };
  }

  function selectedCreateRunUser() {
    return findRunUserCandidate($("#create-run-user")?.value);
  }

  /** 任务运行身份：管理员必须检索指定 LDAP 用户；其他人即当前登录账号 */
  function resolveCreateRunUser() {
    if (isPlatformAdmin()) return selectedCreateRunUser();
    return currentLoginAsRunUser();
  }

  function currentConfigUsername() {
    const run = resolveCreateRunUser();
    if (run?.username) return String(run.username).trim();
    if (isPlatformAdmin()) return "";
    const u = String(MOCK.user?.username || "").trim();
    return u || "user";
  }

  function jobNameForConfigPath(taskName) {
    const raw = String(
      taskName != null && taskName !== "" ? taskName : $("#create-name")?.value || ""
    ).trim();
    return (
      raw
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "unnamed"
    );
  }

  /** 配置挂载默认前缀：/data/hpc/home/<username>/experiments/<任务名称>/configs */
  function defaultConfigMountPath(taskName) {
    const user = currentConfigUsername() || "<username>";
    return `/data/hpc/home/${user}/experiments/${jobNameForConfigPath(taskName)}/configs`;
  }

  function normalizeMountPath(path) {
    return String(path || "").replace(/\/+$/, "") || "/";
  }

  function isHpcConfigMountPath(path) {
    return /^\/data\/hpc\/home\/[^/]+\/experiments\/[^/]+\/configs$/.test(normalizeMountPath(path));
  }

  function isPlatformGeneratedMountPath(path, sourceJob) {
    const p = normalizeMountPath(path);
    if (p === "/workspace/configs") return true;
    if (isHpcConfigMountPath(p)) return true;
    if (sourceJob?.workdir && p === `${normalizeMountPath(sourceJob.workdir)}/configs`) return true;
    if (sourceJob?.name && p === `${conventionPaths(sourceJob.name).workdir}/configs`) return true;
    return false;
  }

  function remountPathForRerun(sourcePath, sourceJob) {
    if (isPlatformGeneratedMountPath(sourcePath, sourceJob)) return defaultConfigMountPath();
    return sourcePath;
  }

  function commandNeedsConfigsHint(command) {
    return /(^|[\s=])configs\//.test(command || "");
  }

  function shouldBlockConfigEditLeave(page) {
    const active = getActivePageId();
    if (active !== "config-edit") return false;
    if (page === "config-edit") return false;
    return configEditorIsDirty();
  }

  function configEditorIsDirty() {
    if (!configEditor) return false;
    return configEditorSnapshot(configEditor) !== configEditor.savedSnapshot;
  }

  function configEditorSnapshot(ed) {
    return JSON.stringify({
      meta: ed.meta,
      files: ed.files,
    });
  }

  function goConfigDetail(id) {
    currentConfigSetId = id;
    const set = findConfigSet(id);
    if (set) {
      set._viewVersion = null;
      set._viewFile = null;
    }
    navigate("config-detail");
  }

  function goConfigCreate() {
    configEditIsNew = true;
    currentConfigSetId = null;
    configEditor = null;
    navigate("config-edit");
  }

  function goConfigEdit(id) {
    configEditIsNew = false;
    currentConfigSetId = id;
    configEditor = null;
    navigate("config-edit");
  }

  function useConfigSetForJob(setId, version) {
    const set = findConfigSet(setId);
    if (!set) return;
    if (set.status === "archived") {
      toast("已归档配置集不能用于新任务，请先恢复", "warning");
      return;
    }
    pendingConfigMount = {
      setId: set.id,
      version: version == null ? "latest_at_submit" : Number(version),
      pinPolicy: version == null ? "latest_at_submit" : "pinned",
    };
    goCreateJob();
  }

  function filterConfigSets() {
    const q = (configListState.q || "").trim().toLowerCase();
    const userName = MOCK.user?.name;
    return visibleConfigSets().filter((set) => {
      if (configListState.teamId !== "all" && set.teamId !== configListState.teamId) return false;
      if (configListState.status !== "all" && set.status !== configListState.status) return false;
      if (configListState.framework !== "all" && set.framework !== configListState.framework) return false;
      if (configListState.scope === "mine" && set.owner !== userName) return false;
      if (configListState.scope === "team" && set.visibility !== "team") return false;
      if (configListState.scope === "private" && set.visibility !== "private") return false;
      if (configListState.scope === "draft" && !set.draft) return false;
      if (q) {
        const display = String(set.displayName || "").toLowerCase();
        if (!display.includes(q)) return false;
      }
      return true;
    });
  }

  function renderConfigList() {
    const teamSel = $("#cfg-filter-team");
    if (teamSel && !teamSel.dataset.bound) {
      teamSel.dataset.bound = "1";
      const teams = isPlatformAdmin() ? MOCK.teams || [] : teamsForCurrentUser();
      teamSel.innerHTML =
        `<option value="all">全部团队</option>` +
        teams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
      teamSel.value = configListState.teamId;
    }
    $("#cfg-search") && ($("#cfg-search").value = configListState.q);
    $("#cfg-filter-scope") && ($("#cfg-filter-scope").value = configListState.scope);
    $("#cfg-filter-status") && ($("#cfg-filter-status").value = configListState.status);
    $("#cfg-filter-framework") && ($("#cfg-filter-framework").value = configListState.framework);

    const rows = filterConfigSets().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / configListState.pageSize));
    if (configListState.page > totalPages) configListState.page = totalPages;
    const start = (configListState.page - 1) * configListState.pageSize;
    const pageRows = rows.slice(start, start + configListState.pageSize);

    const tbody = $("#cfg-tbody");
    const empty = $("#cfg-empty");
    if (!tbody) return;
    if (!pageRows.length) {
      tbody.innerHTML = "";
      if (empty) {
        empty.classList.remove("hidden");
        const hasFilter =
          !!(configListState.q || "").trim() ||
          configListState.teamId !== "all" ||
          configListState.scope !== "all" ||
          configListState.status !== "all" ||
          configListState.framework !== "all";
        empty.textContent = hasFilter
          ? "没有匹配的配置集"
          : "还没有配置集。把 Megatron 的 configs/ 做成配置集，提交任务时默认只读挂到 /data/hpc/home/<username>/experiments/<任务名称>/configs/。";
      }
    } else {
      empty?.classList.add("hidden");
      tbody.innerHTML = pageRows
        .map((set) => {
          const latest = latestConfigVersion(set);
          const archived = set.status === "archived";
          const ownDraft = ownConfigDraft(set);
          return `<tr class="${archived ? "cfg-row-archived" : ""}">
            <td>
              <div class="cfg-name-cell">
                <span class="cfg-display-row">
                  <span class="cfg-display link-cell" data-cfg-view="${set.id}" title="查看配置详情">${escapeHtml(set.displayName)}</span>
                  ${
                    ownDraft
                      ? `<span class="badge badge-warning" title="你有未发布的个人草稿，编辑新版本时会载入草稿而不是已发布版本">草稿</span>`
                      : ""
                  }
                </span>
              </div>
            </td>
            <td>${escapeHtml(set.teamName || "—")}</td>
            <td>${escapeHtml(configFrameworkLabel(set.framework))}</td>
            <td>
              <div>v${latest?.version ?? "—"}</div>
              <div class="text-muted" style="font-size:11.5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(latest?.message || "")}">${escapeHtml(latest?.message || "—")}</div>
            </td>
            <td class="mono">${latest?.files?.length ?? 0}</td>
            <td class="mono text-muted">${escapeHtml(set.updatedAt || "—")}</td>
            <td>${escapeHtml(set.owner || "—")}</td>
            <td class="td-actions">
              ${
                archived
                  ? `<div class="job-actions"><button type="button" class="btn btn-secondary btn-sm" data-cfg-restore="${set.id}">恢复</button></div>`
                  : `<div class="job-actions job-actions-stack">
                       <div class="job-actions-row">
                         <button type="button" class="btn btn-secondary btn-sm" data-cfg-edit="${set.id}">编辑新版本</button>
                       </div>
                       <div class="job-actions-row">
                         <button type="button" class="btn btn-secondary btn-sm" data-cfg-use="${set.id}">用于创建任务</button>
                         <button type="button" class="btn btn-danger btn-sm" data-cfg-archive="${set.id}">归档</button>
                       </div>
                     </div>`
              }
            </td>
          </tr>`;
        })
        .join("");
    }

    $("#cfg-pagination").innerHTML = renderPager({
      total,
      page: configListState.page,
      pageSize: configListState.pageSize,
      key: "cfg",
    });
    bindPager(
      "cfg",
      () => ({ total, page: configListState.page, pageSize: configListState.pageSize }),
      (p) => {
        configListState.page = p;
      },
      (s) => {
        configListState.pageSize = s;
      },
      renderConfigList
    );

    $$("[data-cfg-view]").forEach((b) => b.addEventListener("click", () => goConfigDetail(b.dataset.cfgView)));
    $$("[data-cfg-edit]").forEach((b) => b.addEventListener("click", () => goConfigEdit(b.dataset.cfgEdit)));
    $$("[data-cfg-use]").forEach((b) => b.addEventListener("click", () => useConfigSetForJob(b.dataset.cfgUse)));
    $$("[data-cfg-archive]").forEach((b) => b.addEventListener("click", () => openConfigArchiveModal(b.dataset.cfgArchive, false)));
    $$("[data-cfg-restore]").forEach((b) => b.addEventListener("click", () => openConfigArchiveModal(b.dataset.cfgRestore, true)));

    const createBtn = $("#btn-config-create");
    if (createBtn && createBtn.dataset.bound !== "1") {
      createBtn.dataset.bound = "1";
      createBtn.addEventListener("click", goConfigCreate);
    }
    const bindFilter = (id, key) => {
      const el = $(id);
      if (!el || el.dataset.cfgBound === "1") return;
      el.dataset.cfgBound = "1";
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => {
        configListState[key] = el.value;
        configListState.page = 1;
        renderConfigList();
      });
    };
    bindFilter("#cfg-search", "q");
    bindFilter("#cfg-filter-team", "teamId");
    bindFilter("#cfg-filter-scope", "scope");
    bindFilter("#cfg-filter-status", "status");
    bindFilter("#cfg-filter-framework", "framework");
  }

  function initConfigEditor(set) {
    const teams = teamsForJobCreate();
    if (set) {
      const latest = latestConfigVersion(set);
      const ownDraft = ownConfigDraft(set);
      const sourceFiles = ownDraft ? ownDraft.files : latest?.files;
      configEditor = {
        mode: "edit",
        setId: set.id,
        baseVersion: latest?.version || 0,
        fromDraft: !!ownDraft,
        draftUpdatedAt: ownDraft?.updatedAt || "",
        message: ownDraft?.message || "",
        meta: {
          name: set.name,
          displayName: set.displayName,
          teamId: set.teamId,
          visibility: set.visibility,
          framework: set.framework,
          description: set.description || "",
        },
        files: cloneConfigFiles(sourceFiles),
        activePath: (sourceFiles && sourceFiles[0]?.path) || "",
        tab: "basic",
      };
    } else {
      const teamId = teams[0]?.id || "team-slm";
      configEditor = {
        mode: "create",
        setId: null,
        baseVersion: 0,
        fromDraft: false,
        draftUpdatedAt: "",
        message: "",
        meta: {
          name: "",
          displayName: "",
          teamId,
          visibility: "team",
          framework: "megatron",
          description: "",
        },
        files: cloneConfigFiles(CONFIG_TEMPLATES.megatron),
        activePath: CONFIG_TEMPLATES.megatron[0]?.path || "",
        tab: "basic",
      };
    }
    configEditor.savedSnapshot = configEditorSnapshot(configEditor);
  }

  function applyTemplateToEditor(fw) {
    if (!configEditor) return;
    configEditor.meta.framework = fw;
    configEditor.files = cloneConfigFiles(CONFIG_TEMPLATES[fw] || []);
    configEditor.activePath = configEditor.files[0]?.path || "";
  }

  function persistConfigEditorForm() {
    const ed = configEditor;
    if (!ed) return;
    if ($("#cfg-edit-display")) ed.meta.displayName = $("#cfg-edit-display").value.trim() || "";
    if ($("#cfg-edit-team")) ed.meta.teamId = $("#cfg-edit-team").value || ed.meta.teamId;
    if ($("#cfg-edit-vis")) ed.meta.visibility = $("#cfg-edit-vis").value || "team";
    if ($("#cfg-edit-desc-input")) ed.meta.description = $("#cfg-edit-desc-input").value || "";
    if ($("#cfg-edit-message")) ed.message = $("#cfg-edit-message").value || "";
    const cur = ed.files.find((f) => f.path === ed.activePath);
    if (cur) {
      if ($("#cfg-file-content")) cur.content = $("#cfg-file-content").value;
      cur.kind = "config";
      const pathInput = $("#cfg-file-path");
      if (pathInput) applyActiveFilePath(pathInput.value, { commit: true, silent: true });
    }
  }

  function activeConfigFileItem() {
    return $("#cfg-file-tree .cfg-file-item.is-active");
  }

  function syncActiveFileNameView(path) {
    const item = activeConfigFileItem();
    const label = item?.querySelector(".cfg-file-path");
    if (label) {
      label.textContent = path;
      label.setAttribute("title", path);
    }
    const langEl = $("#cfg-file-lang") || $(".cfg-file-lang");
    if (langEl) langEl.textContent = configFileLangLabel(path);
  }

  function applyActiveFilePath(raw, opts = {}) {
    const ed = configEditor;
    if (!ed) return false;
    const active = ed.files.find((f) => f.path === ed.activePath) || ed.files[0];
    const input = $("#cfg-file-path");
    if (!active) return false;
    const next = String(raw ?? "").replace(/^\/+/, "");
    const trimmed = opts.commit ? next.trim() : next;
    syncActiveFileNameView(trimmed);
    const duplicate = !!trimmed && ed.files.some((f) => f !== active && f.path === trimmed);
    const invalid = !trimmed || /[^\w./-]/.test(trimmed);
    if (!invalid && !duplicate) {
      active.path = trimmed;
      ed.activePath = trimmed;
      const item = activeConfigFileItem();
      if (item) item.dataset.cfgFile = trimmed;
      if (input && opts.commit && input.value.replace(/^\/+/, "").trim() !== trimmed) input.value = trimmed;
      return true;
    }
    if (!opts.commit) return false;
    if (!opts.silent) {
      if (duplicate) toast("相对路径不能重复", "error");
      else if (!trimmed) toast("文件路径不能为空", "error");
      else toast("路径仅允许字母数字、._- 与 /", "error");
    }
    if (input) input.value = active.path;
    syncActiveFileNameView(active.path);
    const item = activeConfigFileItem();
    if (item) item.dataset.cfgFile = active.path;
    return false;
  }

  function syncConfigEditTabMeta() {
    const ed = configEditor;
    if (!ed) return;
    const name = ed.meta.displayName;
    const files = ed.files.length;
    const msg = (ed.message || "").trim();
    const setMeta = (key, text, done) => {
      $(`#cfg-edit-tabs [data-cfg-edit-tab="${key}"]`)?.classList.toggle("is-done", !!done);
      const meta = $(`[data-cfg-edit-tab-meta="${key}"]`);
      if (meta) meta.textContent = text;
    };
    setMeta("basic", name || "名称 / 团队 / 可见性", !!ed.meta.displayName);
    setMeta("files", files ? `${files} 个文件` : "尚未添加文件", files > 0);
    setMeta("publish", msg || "发布前填写说明", !!msg);
  }

  function highlightConfigEditTab(tab) {
    if (configEditor) configEditor.tab = tab;
    $$("#cfg-edit-tabs [data-cfg-edit-tab]").forEach((el) => {
      const on = el.dataset.cfgEditTab === tab;
      el.classList.toggle("active", on);
      el.setAttribute("aria-current", on ? "true" : "false");
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function cfgEditSectionEl(tab) {
    return $(`#cfg-edit-panels > [data-panel="${tab}"]`);
  }

  function scrollToConfigEditSection(tab) {
    const panel = cfgEditSectionEl(tab);
    if (!panel) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cfgEditScrollLock += 1;
    panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => {
      cfgEditScrollLock = Math.max(0, cfgEditScrollLock - 1);
    }, reduce ? 80 : 700);
  }

  function switchConfigEditTab(tab, opts = {}) {
    if (!configEditor) return;
    persistConfigEditorForm();
    if (!CFG_EDIT_TABS.includes(tab)) tab = "basic";
    highlightConfigEditTab(tab);
    if (opts.scroll !== false) scrollToConfigEditSection(tab);
    bindYamlEditor($("#cfg-file-content"), $("#cfg-file-hl"));
    syncConfigEditTabMeta();
  }

  function syncConfigEditTabFromScroll() {
    const page = $("#page-config-edit");
    const tabsEl = $("#cfg-edit-tabs");
    if (!page?.classList.contains("active") || !tabsEl) return;
    const topbarBottom = $(".topbar")?.getBoundingClientRect().bottom || 56;
    tabsEl.classList.toggle("is-stuck", tabsEl.getBoundingClientRect().top <= topbarBottom + 0.5);
    if (cfgEditScrollLock) return;
    const offset = tabsEl.getBoundingClientRect().bottom + 12;
    let current = CFG_EDIT_TABS[0];
    for (const key of CFG_EDIT_TABS) {
      const el = cfgEditSectionEl(key);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= offset) current = key;
    }
    if (current && current !== configEditor?.tab) highlightConfigEditTab(current);
  }

  function focusConfigEditIssue(tab, message) {
    switchConfigEditTab(tab);
    toast(message, "error");
  }

  function configEditDraftBannerHtml(ed) {
    const icon = `<span class="cfg-draft-banner-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>`;
    const text = "当前编辑的是个人草稿，不是已发布版本";
    return `${icon}<span class="cfg-draft-banner-copy">${text}</span>`;
  }

  function syncConfigEditDraftChrome() {
    const ed = configEditor;
    const titleText = $("#cfg-edit-title-text") || $("#cfg-edit-title");
    const badge = $("#cfg-edit-draft-badge");
    const desc = $("#cfg-edit-desc");
    const banner = $("#cfg-edit-draft-banner");
    const tabFlag = $("#cfg-edit-draft-flag");
    if (!ed) {
      badge?.classList.add("hidden");
      banner?.classList.add("hidden");
      tabFlag?.classList.add("hidden");
      return;
    }
    const isNew = ed.mode === "create";
    const fromDraft = !isNew && !!ed.fromDraft;
    if (titleText) {
      titleText.textContent = isNew ? "新建配置集" : `发布新版本 · ${ed.meta.displayName || ""}`;
    }
    if (desc) {
      desc.textContent = isNew
        ? "填写基本信息与文件，保存草稿或直接发布为 v1"
        : "在线编辑多文件 YAML，保存草稿或发布为不可变版本";
    }
    badge?.classList.toggle("hidden", !fromDraft);
    if (banner) {
      if (fromDraft) {
        banner.innerHTML = configEditDraftBannerHtml(ed);
        banner.classList.remove("hidden");
      } else {
        banner.innerHTML = "";
        banner.classList.add("hidden");
      }
    }
    tabFlag?.classList.toggle("hidden", !fromDraft);
  }

  function renderConfigEdit() {
    if (configEditIsNew) {
      if (!configEditor || configEditor.mode !== "create") initConfigEditor(null);
    } else {
      const set = findConfigSet(currentConfigSetId);
      if (!set) {
        toast("配置集不存在", "error");
        navigate("configs");
        return;
      }
      if (!configEditor || configEditor.setId !== set.id) initConfigEditor(set);
    }

    const ed = configEditor;
    const isNew = ed.mode === "create";
    const nextVer = (ed.baseVersion || 0) + 1;
    syncConfigEditDraftChrome();

    if (!ed.tab || !CFG_EDIT_TABS.includes(ed.tab)) ed.tab = "basic";

    const teams = teamsForJobCreate();
    const teamOpts = teams
      .map((t) => `<option value="${t.id}" ${t.id === ed.meta.teamId ? "selected" : ""}>${escapeHtml(t.name)}</option>`)
      .join("");
    const active = ed.files.find((f) => f.path === ed.activePath) || ed.files[0] || null;

    $("#cfg-edit-body").innerHTML = `
      <div class="cfg-editor-layout">
        <div class="card job-create-form-card cfg-edit-form-card">
          <div class="tabs create-form-tabs" id="cfg-edit-tabs" role="navigation" aria-label="配置表单章节">
            <button type="button" class="tab" data-cfg-edit-tab="basic" aria-current="false" aria-controls="cfg-edit-section-basic">
              <span class="num">1</span>
              <span class="create-tab-copy">
                <span class="create-tab-title">基本信息</span>
                <span class="create-tab-meta" data-cfg-edit-tab-meta="basic">名称 / 团队 / 可见性</span>
              </span>
            </button>
            <button type="button" class="tab" data-cfg-edit-tab="files" aria-current="false" aria-controls="cfg-edit-section-files">
              <span class="num">2</span>
              <span class="create-tab-copy">
                <span class="create-tab-title">文件</span>
                <span class="create-tab-meta" data-cfg-edit-tab-meta="files">YAML / JSON</span>
              </span>
            </button>
            <button type="button" class="tab" data-cfg-edit-tab="publish" aria-current="false" aria-controls="cfg-edit-section-publish">
              <span class="num">3</span>
              <span class="create-tab-copy">
                <span class="create-tab-title">版本说明</span>
                <span class="create-tab-meta" data-cfg-edit-tab-meta="publish">发布前填写说明</span>
              </span>
            </button>
            <span id="cfg-edit-draft-flag" class="cfg-edit-draft-flag ${ed.fromDraft ? "" : "hidden"}">个人草稿</span>
          </div>
          <div id="cfg-edit-panels">
            <div class="tab-panel create-form-section" data-panel="basic" id="cfg-edit-section-basic" role="region" aria-labelledby="cfg-edit-section-basic-title">
              <div class="form-section-title" id="cfg-edit-section-basic-title"><span class="num">1</span> 基本信息</div>
              <div class="form-grid">
                <div class="form-group">
                  <label>显示名称 <span class="req">*</span></label>
                  <input id="cfg-edit-display" placeholder="例如 SLM 7B Phase4 预训练" value="${escapeHtml(ed.meta.displayName)}" />
                </div>
                <div class="form-group">
                  <label>所属团队 <span class="req">*</span></label>
                  <select id="cfg-edit-team">${teamOpts}</select>
                </div>
                <div class="form-group">
                  <label>可见性</label>
                  <select id="cfg-edit-vis">
                    <option value="team" ${ed.meta.visibility === "team" ? "selected" : ""}>团队共享</option>
                    <option value="private" ${ed.meta.visibility === "private" ? "selected" : ""}>仅自己可见</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>框架模板</label>
                  <select id="cfg-edit-fw">
                    <option value="megatron" ${ed.meta.framework === "megatron" ? "selected" : ""}>Megatron</option>
                    <option value="nemo" ${ed.meta.framework === "nemo" ? "selected" : ""}>NeMo</option>
                    <option value="accelerate" ${ed.meta.framework === "accelerate" ? "selected" : ""}>Accelerate</option>
                    <option value="custom" ${ed.meta.framework === "custom" ? "selected" : ""}>自定义</option>
                  </select>
                </div>
                <div class="form-group full">
                  <label>描述</label>
                  <textarea id="cfg-edit-desc-input" style="min-height:64px">${escapeHtml(ed.meta.description)}</textarea>
                </div>
              </div>
            </div>
            <div class="tab-panel create-form-section" data-panel="files" id="cfg-edit-section-files" role="region" aria-labelledby="cfg-edit-section-files-title">
              <div class="form-section-title" id="cfg-edit-section-files-title"><span class="num">2</span> 文件</div>
              <div class="cfg-file-workspace">
                <aside class="cfg-file-tree">
                  <div class="cfg-file-tree-head">
                    <div class="cfg-file-tree-title">
                      <span>文件</span>
                      <span class="cfg-file-count">${ed.files.length}</span>
                    </div>
                    <div class="cfg-file-tree-actions">
                      <button type="button" class="btn btn-ghost btn-sm" id="btn-cfg-new-file">+ 文件</button>
                      <label class="btn btn-ghost btn-sm" style="margin:0">
                        上传
                        <input type="file" id="cfg-upload" multiple hidden />
                      </label>
                    </div>
                  </div>
                  <div class="cfg-file-tree-list" id="cfg-file-tree">
                    ${
                      ed.files.length
                        ? ed.files
                            .map(
                              (f) => `<button type="button" class="cfg-file-item ${f.path === active?.path ? "is-active" : ""}${configFileOverLimit(f) ? " is-over" : ""}" data-cfg-file="${escapeHtml(f.path)}">
                                <span class="cfg-file-glyph" aria-hidden="true"></span>
                                <span class="cfg-file-path" title="${escapeHtml(f.path)}">${escapeHtml(f.path)}</span>
                                ${configFileOverLimit(f) ? `<span class="cfg-file-over">超限</span>` : ""}
                              </button>`
                            )
                            .join("")
                        : `<div class="cfg-file-empty">还没有文件<br/><span>点击上方新建或上传</span></div>`
                    }
                  </div>
                  <div class="cfg-file-tree-foot">每个配置文件不超过 50 KB</div>
                </aside>
                <section class="cfg-file-editor">
                  ${
                    active
                      ? `<div class="cfg-file-editor-head">
                          <input id="cfg-file-path" class="cfg-file-path-input mono" value="${escapeHtml(active.path)}" spellcheck="false" />
                          <span class="cfg-file-lang" id="cfg-file-lang">${escapeHtml(configFileLangLabel(active.path))}</span>
                          ${renderConfigFileSizeBadge(active)}
                          <button type="button" class="btn btn-danger btn-sm" id="btn-cfg-del-file">删除</button>
                        </div>
                        <div class="code-editor cfg-file-code">
                          <pre class="code-editor-hl" id="cfg-file-hl" aria-hidden="true"></pre>
                          <textarea id="cfg-file-content" class="code-editor-input" spellcheck="false">${escapeHtml(active.content || "")}</textarea>
                        </div>`
                      : `<div class="cfg-file-empty is-editor">选择左侧文件，或新建一个文件开始编辑</div>`
                  }
                </section>
              </div>
            </div>
            <div class="tab-panel create-form-section" data-panel="publish" id="cfg-edit-section-publish" role="region" aria-labelledby="cfg-edit-section-publish-title">
              <div class="form-section-title" id="cfg-edit-section-publish-title"><span class="num">3</span> 版本说明</div>
              <div class="form-grid">
                <div class="form-group full">
                  <label>版本说明（发布必填）</label>
                  <input id="cfg-edit-message" placeholder="说明本版相对上一版改了什么，例如：学习率降至 1.5e-4，序列长度改为 8192" value="${escapeHtml(ed.message || "")}" />
                </div>
                <div class="form-group">
                  <div class="field-label-row">
                    <label>基于版本</label>
                    <span class="field-lock-hint">只读</span>
                  </div>
                  <input class="mono" readonly value="${ed.baseVersion ? `v${ed.baseVersion}` : "—（首版）"}" />
                </div>
              </div>
            </div>
          </div>
          <div class="create-form-footer cfg-edit-footer">
            <div class="flex gap-8">
              <button type="button" class="btn btn-secondary" id="btn-cfg-edit-cancel">取消</button>
              <button type="button" class="btn btn-secondary" id="btn-cfg-save-draft">保存草稿</button>
              <button type="button" class="btn btn-primary" id="btn-cfg-publish">发布为 v${nextVer}</button>
            </div>
          </div>
        </div>
      </div>`;

    ["cfg-edit-display", "cfg-edit-team", "cfg-edit-vis", "cfg-edit-desc-input", "cfg-edit-message"].forEach(
      (id) => {
        const onChange = () => {
          persistConfigEditorForm();
          syncConfigEditTabMeta();
        };
        $(`#${id}`)?.addEventListener("input", onChange);
        $(`#${id}`)?.addEventListener("change", onChange);
      }
    );
    $$("#cfg-edit-tabs [data-cfg-edit-tab]").forEach((el) => {
      el.addEventListener("click", () => switchConfigEditTab(el.dataset.cfgEditTab, { scroll: true }));
    });
    $("#cfg-edit-fw")?.addEventListener("change", (e) => {
      persistConfigEditorForm();
      applyTemplateToEditor(e.target.value);
      renderConfigEdit();
    });
    $$("[data-cfg-file]").forEach((b) => {
      b.addEventListener("click", () => {
        persistConfigEditorForm();
        ed.activePath = b.dataset.cfgFile;
        ed.tab = "files";
        renderConfigEdit();
      });
    });
    $("#cfg-file-path")?.addEventListener("input", () => {
      applyActiveFilePath($("#cfg-file-path")?.value || "");
    });
    $("#cfg-file-path")?.addEventListener("change", () => {
      applyActiveFilePath($("#cfg-file-path")?.value || "", { commit: true });
    });
    $("#cfg-file-content")?.addEventListener("input", (e) => {
      if (active) active.content = e.target.value;
      updateConfigFileSizeBadge();
    });
    $("#btn-cfg-new-file")?.addEventListener("click", () => {
      persistConfigEditorForm();
      const path = window.prompt("新文件相对路径", "extra.yaml");
      if (!path) return;
      const rel = path.trim().replace(/^\/+/, "");
      if (!rel || /[^\w./-]/.test(rel)) {
        toast("路径仅允许字母数字、._- 与 /", "error");
        return;
      }
      if (ed.files.some((f) => f.path === rel)) {
        toast("文件已存在", "warning");
        return;
      }
      ed.files.push({ path: rel, kind: "config", content: "" });
      ed.activePath = rel;
      ed.tab = "files";
      renderConfigEdit();
    });
    $("#cfg-upload")?.addEventListener("change", (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = "";
      files.forEach((file) => {
        if (file.size > CONFIG_FILE_MAX_BYTES) {
          toast(`${file.name} 超过 ${CONFIG_FILE_MAX_LABEL}，未导入`, "error");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          persistConfigEditorForm();
          const rel = file.name.replace(/^\/+/, "");
          const content = String(reader.result || "");
          const probe = { path: rel, content };
          if (configFileOverLimit(probe)) {
            toast(`${rel} 超过 ${CONFIG_FILE_MAX_LABEL}，未导入`, "error");
            return;
          }
          const exist = ed.files.find((f) => f.path === rel);
          if (exist) exist.content = content;
          else ed.files.push({ path: rel, kind: "config", content });
          ed.activePath = rel;
          ed.tab = "files";
          renderConfigEdit();
        };
        reader.readAsText(file);
      });
    });
    $("#btn-cfg-del-file")?.addEventListener("click", () => {
      if (!active) return;
      openConfigFileDeleteConfirm(active.path);
    });
    $("#btn-cfg-edit-cancel")?.addEventListener("click", () => {
      if (isNew) navigate("configs");
      else goConfigDetail(ed.setId);
    });
    $("#btn-cfg-save-draft")?.addEventListener("click", () => {
      persistConfigEditorForm();
      saveConfigDraft();
    });
    $("#btn-cfg-publish")?.addEventListener("click", () => {
      persistConfigEditorForm();
      publishConfigVersion();
    });

    switchConfigEditTab(ed.tab || "basic", { scroll: false });
    syncConfigEditDraftChrome();
  }

  function openConfigFileDeleteConfirm(path) {
    const ed = configEditor;
    const rel = String(path || "").trim();
    if (!ed || !rel) return;
    persistConfigEditorForm();
    pendingConfigFilePath = rel;
    const nameEl = $("#modal-cfg-del-file-name");
    if (nameEl) nameEl.textContent = rel;
    $("#modal-cfg-del-file")?.classList.add("show");
  }

  function closeConfigFileDeleteConfirm() {
    $("#modal-cfg-del-file")?.classList.remove("show");
    pendingConfigFilePath = null;
  }

  function confirmConfigFileDelete() {
    const ed = configEditor;
    const path = pendingConfigFilePath;
    if (!ed || !path) return closeConfigFileDeleteConfirm();
    persistConfigEditorForm();
    ed.files = ed.files.filter((f) => f.path !== path);
    if (ed.activePath === path) ed.activePath = ed.files[0]?.path || "";
    ed.tab = "files";
    closeConfigFileDeleteConfirm();
    renderConfigEdit();
    toast("已删除文件");
  }

  function saveConfigDraft() {
    const ed = configEditor;
    if (!ed) return;
    persistConfigEditorForm();
    if (!assertConfigFilesWithinLimit()) return;
    if (ed.mode === "create") {
      if (!ed.meta.displayName) {
        focusConfigEditIssue("basic", "保存草稿前请填写显示名称");
        return;
      }
      if (isConfigDisplayNameTaken(ed.meta.displayName, ed.meta.teamId)) {
        focusConfigEditIssue("basic", "同团队下显示名称已存在");
        return;
      }
      const team = findTeam(ed.meta.teamId);
      const { name, id } = makeConfigSetKeys(ed.meta.displayName);
      ed.meta.name = name;
      const set = {
        id,
        name,
        displayName: ed.meta.displayName,
        teamId: ed.meta.teamId,
        teamName: team?.name || "",
        framework: ed.meta.framework,
        visibility: ed.meta.visibility,
        status: "active",
        owner: MOCK.user.name,
        ownerUsername: MOCK.user.username || "",
        description: ed.meta.description,
        createdAt: nowStamp(),
        updatedAt: nowStamp(),
        latestVersion: 0,
        draft: {
          owner: MOCK.user.name,
          ownerUsername: MOCK.user.username || "",
          updatedAt: nowStamp(),
          message: ed.message || "",
          files: cloneConfigFiles(ed.files),
        },
        versions: [],
      };
      MOCK.configSets.unshift(set);
      configEditIsNew = false;
      currentConfigSetId = id;
      ed.mode = "edit";
      ed.setId = id;
      ed.fromDraft = true;
      ed.draftUpdatedAt = set.draft.updatedAt;
      ed.savedSnapshot = configEditorSnapshot(ed);
      toast("草稿已保存");
      navigate("config-edit");
      return;
    }
    const set = findConfigSet(ed.setId);
    if (!set) return;
    set.draft = {
      owner: MOCK.user.name,
      ownerUsername: MOCK.user.username || "",
      updatedAt: nowStamp(),
      message: ed.message || "",
      files: cloneConfigFiles(ed.files),
    };
    set.updatedAt = nowStamp();
    ed.fromDraft = true;
    ed.draftUpdatedAt = set.draft.updatedAt;
    ed.savedSnapshot = configEditorSnapshot(ed);
    syncConfigEditDraftChrome();
    toast("草稿已保存");
  }

  function publishConfigVersion() {
    const ed = configEditor;
    if (!ed) return;
    persistConfigEditorForm();
    if (!assertConfigFilesWithinLimit()) return;
    if (!ed.meta.displayName) {
      focusConfigEditIssue("basic", "请填写显示名称");
      return;
    }
    if (isConfigDisplayNameTaken(ed.meta.displayName, ed.meta.teamId, ed.setId || currentConfigSetId)) {
      focusConfigEditIssue("basic", "同团队下显示名称已存在");
      return;
    }
    if (!ed.files.length) {
      focusConfigEditIssue("files", "至少需要一个文件");
      return;
    }
    if (!(ed.message || "").trim()) {
      focusConfigEditIssue("publish", "发布时必须填写版本说明");
      return;
    }
    if (ed.mode === "create") {
      saveConfigDraft();
    }
    const set = findConfigSet(ed.setId || currentConfigSetId);
    if (!set) return;
    if (set.latestVersion && ed.baseVersion !== set.latestVersion) {
      toast(`版本冲突（409）：最新已是 v${set.latestVersion}，请重新加载后再发布`, "error");
      return;
    }
    const ver = (set.latestVersion || 0) + 1;
    const files = cloneConfigFiles(ed.files);
    set.versions.push({
      version: ver,
      message: ed.message.trim(),
      author: MOCK.user.name,
      createdAt: nowStamp(),
      digest: mockDigest(files),
      files,
    });
    set.latestVersion = ver;
    set.displayName = ed.meta.displayName;
    set.visibility = ed.meta.visibility;
    set.framework = ed.meta.framework;
    set.description = ed.meta.description;
    set.updatedAt = nowStamp();
    set.draft = null;
    ed.savedSnapshot = configEditorSnapshot(ed);
    toast(`已发布 v${ver}`);
    goConfigDetail(set.id);
  }

  function renderConfigDetail() {
    const set = findConfigSet(currentConfigSetId);
    if (!set) {
      toast("配置集不存在", "error");
      navigate("configs");
      return;
    }
    const viewVer = configDetailViewVersion(set);
    const ownDraft = ownConfigDraft(set);
    $("#cfg-detail-hero").innerHTML = `
      <div class="detail-hero-top">
        <div>
          <h2>${escapeHtml(set.displayName)} ${
            set.status === "archived"
              ? '<span class="badge badge-cancelled">已归档</span>'
              : '<span class="badge badge-healthy">使用中</span>'
          }${ownDraft ? '<span class="badge badge-warning">有个人草稿</span>' : ""}</h2>
        </div>
        <div class="cfg-hero-actions">
          ${
            set.status === "archived"
              ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-cfg-hero-restore">恢复</button>`
              : `<button type="button" class="btn btn-primary btn-sm" id="btn-cfg-hero-edit">编辑新版本</button>
                 <button type="button" class="btn btn-secondary btn-sm" id="btn-cfg-hero-use">用于创建任务</button>
                 <button type="button" class="btn btn-danger btn-sm" id="btn-cfg-hero-archive">归档</button>`
          }
        </div>
      </div>
      <div class="detail-meta">
        <div class="meta-item"><div class="label">团队</div><div class="value">${escapeHtml(set.teamName || "—")}</div></div>
        <div class="meta-item"><div class="label">框架</div><div class="value">${escapeHtml(configFrameworkLabel(set.framework))}</div></div>
        <div class="meta-item"><div class="label">最新版本</div><div class="value mono">v${set.latestVersion || "—"}</div></div>
        <div class="meta-item"><div class="label">创建人</div><div class="value">${escapeHtml(set.owner || "—")}</div></div>
        <div class="meta-item"><div class="label">更新时间</div><div class="value mono">${escapeHtml(set.updatedAt || "—")}</div></div>
        ${
          ownDraft
            ? `<div class="meta-item"><div class="label">个人草稿</div><div class="value">${escapeHtml(ownDraft.updatedAt || "未发布")} 保存，编辑新版本将载入草稿</div></div>`
            : ""
        }
      </div>`;

    $("#btn-cfg-hero-edit")?.addEventListener("click", () => goConfigEdit(set.id));
    $("#btn-cfg-hero-use")?.addEventListener("click", () => useConfigSetForJob(set.id));
    $("#btn-cfg-hero-archive")?.addEventListener("click", () => openConfigArchiveModal(set.id, false));
    $("#btn-cfg-hero-restore")?.addEventListener("click", () => openConfigArchiveModal(set.id, true));

    initTabs("#cfg-detail-tabs", "#cfg-detail-panels", (t) => {
      if (t === "files") renderConfigDetailFiles(set, configDetailViewVersion(set));
      if (t === "history") renderConfigDetailHistory(set);
    });
    const activeTab = $("#cfg-detail-tabs .tab.active")?.dataset.tab || "files";
    if (activeTab === "history") renderConfigDetailHistory(set);
    else renderConfigDetailFiles(set, viewVer);
  }

  function configDetailViewVersion(set) {
    if (!set) return null;
    return findConfigVersion(set, set._viewVersion || latestConfigVersion(set)?.version);
  }

  function openConfigDetailVersion(set, version) {
    if (!set) return;
    const ver = findConfigVersion(set, version);
    set._viewVersion = ver?.version ?? Number(version);
    if (set._viewFile && !(ver?.files || []).some((f) => f.path === set._viewFile)) {
      set._viewFile = null;
    }
    const tab = $("#cfg-detail-tabs .tab[data-tab='files']");
    if (tab) tab.click();
    else renderConfigDetailFiles(set, ver);
  }

  function renderConfigDetailFiles(set, ver) {
    const files = ver?.files || [];
    const activePath = set._viewFile || files[0]?.path || "";
    const active = files.find((f) => f.path === activePath) || files[0];
    const isLatest = ver && set.latestVersion && Number(ver.version) === Number(set.latestVersion);
    $("#panel-cfg-files").innerHTML = `
      <div class="cfg-file-workspace cfg-view-workspace">
        <div class="cfg-view-bar">
          <div class="cfg-view-bar-row">
            <div class="cfg-view-ver">
              <span class="cfg-view-label">正在查看</span>
              <span class="cfg-ver-chip${isLatest ? " is-latest" : ""}">v${ver?.version ?? "—"}</span>
              ${isLatest ? `<span class="cfg-ver-flag">最新</span>` : ""}
            </div>
            <div class="cfg-view-stats">${files.length} 个文件 · ${formatBytes(configVersionBytes(ver))}</div>
          </div>
          ${
            ver?.message
              ? `<div class="cfg-view-note"><span class="cfg-view-label">说明</span><p>${escapeHtml(ver.message)}</p></div>`
              : ""
          }
        </div>
        <aside class="cfg-file-tree">
          <div class="cfg-file-tree-head">
            <div class="cfg-file-tree-title">
              <span>文件</span>
              <span class="cfg-file-count">${files.length}</span>
            </div>
          </div>
          <div class="cfg-file-tree-list">
            ${
              files.length
                ? files
                    .map(
                      (f) => `<button type="button" class="cfg-file-item ${f.path === active?.path ? "is-active" : ""}" data-cfg-view-file="${escapeHtml(f.path)}">
                        <span class="cfg-file-glyph" aria-hidden="true"></span>
                        <span class="cfg-file-path" title="${escapeHtml(f.path)}">${escapeHtml(f.path)}</span>
                      </button>`
                    )
                    .join("")
                : `<div class="cfg-file-empty">没有文件</div>`
            }
          </div>
        </aside>
        <section class="cfg-file-editor">
          ${
            active
              ? `<div class="cfg-file-editor-head">
                  <span class="cfg-file-path-label mono" title="${escapeHtml(active.path)}">${escapeHtml(active.path)}</span>
                  <span class="cfg-file-lang">${escapeHtml(configFileLangLabel(active.path))}</span>
                  <span class="cfg-file-size">${formatBytes(configFileBytes(active))}</span>
                </div>
                ${codeBlockHtml(active.content || "", langFromPath(active.path), "cfg-view-code")}`
              : `<div class="cfg-file-empty is-editor">选择左侧文件查看内容</div>`
          }
        </section>
      </div>`;
    $$("[data-cfg-view-file]").forEach((b) => {
      b.addEventListener("click", () => {
        set._viewFile = b.dataset.cfgViewFile;
        renderConfigDetailFiles(set, ver);
      });
    });
  }

  function renderConfigDetailHistory(set) {
    const vers = [...(set.versions || [])].sort((a, b) => b.version - a.version);
    $("#panel-cfg-history").innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>版本</th><th>说明</th><th>发布人</th><th>发布时间</th><th>文件数</th><th class="th-actions">操作</th></tr></thead>
          <tbody>
            ${vers
              .map((v) => {
                const hasPrev = (set.versions || []).some((x) => x.version < v.version);
                const viewing = Number(set._viewVersion || set.latestVersion) === Number(v.version);
                return `<tr class="${viewing ? "is-viewing" : ""}">
                  <td class="mono">v${v.version}${v.version === set.latestVersion ? ' <span class="badge badge-info">最新</span>' : ""}</td>
                  <td>${escapeHtml(v.message || "—")}</td>
                  <td>${escapeHtml(v.author || "—")}</td>
                  <td class="mono text-muted">${escapeHtml(v.createdAt || "—")}</td>
                  <td class="mono">${v.files?.length || 0}</td>
                  <td class="td-actions">
                    <button type="button" class="btn btn-ghost btn-sm" data-cfg-hist-view="${v.version}">查看</button>
                    ${
                      hasPrev
                        ? `<button type="button" class="btn btn-ghost btn-sm" data-cfg-hist-compare="${v.version}">对比上一版</button>`
                        : ""
                    }
                    ${
                      set.status === "archived"
                        ? ""
                        : `<button type="button" class="btn btn-secondary btn-sm" data-cfg-hist-use="${v.version}">用此版本创建任务</button>`
                    }
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`;
    $$("[data-cfg-hist-view]").forEach((b) => {
      b.addEventListener("click", () => openConfigDetailVersion(set, Number(b.dataset.cfgHistView)));
    });
    $$("[data-cfg-hist-compare]").forEach((b) => {
      b.addEventListener("click", () => openConfigCompareModal(set, Number(b.dataset.cfgHistCompare)));
    });
    $$("[data-cfg-hist-use]").forEach((b) => {
      b.addEventListener("click", () => useConfigSetForJob(set.id, Number(b.dataset.cfgHistUse)));
    });
  }

  function configChangeLabel(tag) {
    return { A: "新增", D: "删除", M: "修改", "=": "相同" }[tag] || "修改";
  }

  function configFilePreview(file) {
    if (!file) return "";
    return file.content || "";
  }

  function renderConfigComparePanes(row, prev, cur) {
    if (!row) return `<div class="empty-state">没有可对比的文件</div>`;
    const lang = langFromPath(row.path);
    const leftLabel = prev ? `v${prev.version}` : "上一版";
    const rightLabel = cur ? `v${cur.version}` : "当前版";
    if (row.tag === "A") {
      return `<div class="cfg-compare-panes is-single">
        <div class="cfg-compare-pane">
          <div class="cfg-compare-label">${rightLabel} · 本版新增</div>
          ${codeBlockHtml(configFilePreview(row.b), lang)}
        </div>
      </div>`;
    }
    if (row.tag === "D") {
      return `<div class="cfg-compare-panes is-single">
        <div class="cfg-compare-pane">
          <div class="cfg-compare-label">${leftLabel} · 本版已删除</div>
          ${codeBlockHtml(configFilePreview(row.a), lang)}
        </div>
      </div>`;
    }
    return `<div class="cfg-compare-panes">
      <div class="cfg-compare-pane">
        <div class="cfg-compare-label">${leftLabel}</div>
        ${codeBlockHtml(configFilePreview(row.a), lang)}
      </div>
      <div class="cfg-compare-pane">
        <div class="cfg-compare-label">${rightLabel}${row.tag === "=" ? " · 内容相同" : ""}</div>
        ${codeBlockHtml(configFilePreview(row.b), lang)}
      </div>
    </div>`;
  }

  function openConfigCompareModal(set, verNum) {
    const cur = findConfigVersion(set, verNum);
    const prev = [...(set.versions || [])].filter((v) => v.version < verNum).sort((a, b) => b.version - a.version)[0];
    const aMap = Object.fromEntries((prev?.files || []).map((f) => [f.path, f]));
    const bMap = Object.fromEntries((cur?.files || []).map((f) => [f.path, f]));
    const paths = [...new Set([...Object.keys(aMap), ...Object.keys(bMap)])].sort();
    const rows = paths.map((p) => {
      const a = aMap[p];
      const b = bMap[p];
      let tag = "M";
      if (!a) tag = "A";
      else if (!b) tag = "D";
      else if (a.content === b.content && a.kind === b.kind) tag = "=";
      return { path: p, tag, a, b };
    });
    const changed = rows.filter((r) => r.tag !== "=");
    let active = changed[0]?.path || rows[0]?.path;
    const renderBody = () => {
      const row = rows.find((r) => r.path === active);
      $("#modal-cfg-diff-title").textContent = prev
        ? `版本对比 · ${set.displayName} · v${prev.version} → v${cur?.version}`
        : `版本对比 · ${set.displayName} · v${cur?.version}`;
      $("#modal-cfg-diff-body").innerHTML = `
        <div class="cfg-diff-layout">
          <div class="cfg-diff-files">
            ${rows
              .map(
                (r) => `<button type="button" class="${r.path === active ? "is-active" : ""}" data-compare-path="${escapeHtml(r.path)}">
                  <span class="cfg-diff-tag ${r.tag === "A" ? "is-a" : r.tag === "D" ? "is-d" : r.tag === "M" ? "is-m" : ""}">${configChangeLabel(r.tag)}</span>
                  <span class="cfg-compare-path">${escapeHtml(r.path)}</span>
                </button>`
              )
              .join("")}
          </div>
          ${renderConfigComparePanes(row, prev, cur)}
        </div>`;
      $$("[data-compare-path]").forEach((b) => {
        b.addEventListener("click", () => {
          active = b.dataset.comparePath;
          renderBody();
        });
      });
    };
    renderBody();
    $("#modal-cfg-diff")?.classList.add("show");
  }

  function closeConfigDiffModal() {
    $("#modal-cfg-diff")?.classList.remove("show");
  }

  function openConfigArchiveModal(id, restore) {
    const set = findConfigSet(id);
    if (!set) return;
    pendingArchiveSetId = id;
    pendingArchiveRestore = !!restore;
    $("#modal-cfg-archive-title").textContent = restore ? "恢复配置集" : "归档配置集";
    $("#modal-cfg-archive-verb").textContent = restore ? "恢复" : "归档";
    $("#modal-cfg-archive-name").textContent = set.displayName;
    setConfirmHint(
      $("#modal-cfg-archive-hint"),
      restore
        ? "恢复后可再次用于新建任务挂载。历史任务快照不受影响。"
        : "已绑定任务的版本快照仍保留，可在任务详情回看当时内容。归档后新建任务下拉不再出现该配置集。",
      restore ? "restore" : "archive"
    );
    $("#modal-cfg-archive-confirm").textContent = restore ? "确认恢复" : "确认归档";
    $("#modal-cfg-archive-confirm").className = restore ? "btn btn-primary" : "btn btn-danger";
    $("#modal-cfg-archive")?.classList.add("show");
  }

  function closeConfigArchiveModal() {
    $("#modal-cfg-archive")?.classList.remove("show");
    pendingArchiveSetId = null;
  }

  function confirmConfigArchive() {
    const set = findConfigSet(pendingArchiveSetId);
    if (!set) return closeConfigArchiveModal();
    set.status = pendingArchiveRestore ? "active" : "archived";
    set.updatedAt = nowStamp();
    toast(pendingArchiveRestore ? "已恢复配置集" : "已归档配置集");
    closeConfigArchiveModal();
    if (getActivePageId() === "config-detail") renderConfigDetail();
    else renderConfigList();
  }

  function openConfigDirtyModal() {
    $("#modal-cfg-dirty")?.classList.add("show");
  }

  function closeConfigDirtyModal() {
    $("#modal-cfg-dirty")?.classList.remove("show");
  }

  function confirmConfigDirtyLeave() {
    const next = pendingConfigDirtyLeave;
    pendingConfigDirtyLeave = null;
    configEditor = null;
    closeConfigDirtyModal();
    if (next) navigate(next.page, { ...(next.opts || {}), force: true });
  }

  function newCreateMount(partial = {}) {
    const generated = defaultConfigMountPath();
    const mountPath = partial.mountPath || generated;
    const isGenerated =
      partial.isPlatformGenerated != null
        ? !!partial.isPlatformGenerated
        : isPlatformGeneratedMountPath(mountPath);
    return {
      uid: `m${createMountUid++}`,
      setId: partial.setId || "",
      version: partial.version == null ? "latest_at_submit" : partial.version,
      pinPolicy: partial.pinPolicy || (partial.version == null || partial.version === "latest_at_submit" ? "latest_at_submit" : "pinned"),
      mode: partial.mode || "dir",
      mountPath,
      selected: partial.selected || null,
      preview: !!partial.preview,
      isPlatformGenerated: isGenerated,
    };
  }

  function syncPlatformGeneratedMountPaths() {
    const next = defaultConfigMountPath();
    createConfigMounts.forEach((m) => {
      if (m.isPlatformGenerated) m.mountPath = next;
    });
  }

  const CONFIG_MOUNT_PATH_PATTERN = "/data/hpc/home/<username>/experiments/<任务名称>/configs/";

  function defaultCreateMounts() {
    return [];
  }

  function syncCreateConfigAddButton() {
    const btn = $("#btn-add-config-mount");
    if (!btn) return;
    const has = createConfigMounts.length > 0;
    btn.classList.toggle("is-compact", has);
    const title = btn.querySelector(".cfg-add-mount-title");
    const desc = btn.querySelector(".cfg-add-mount-desc");
    if (title) title.textContent = has ? "继续添加配置集" : "添加配置集";
    if (desc) {
      desc.textContent = has
        ? "可再挂另一套配置；路径不能相同或互为前缀"
        : `从配置管理选择一版 YAML，默认挂到 ${CONFIG_MOUNT_PATH_PATTERN}`;
    }
  }

  function mountsFromJob(job) {
    return (job.configMounts || []).map((m) =>
      newCreateMount({
        setId: m.setId,
        version: m.version,
        pinPolicy: "pinned",
        mode: m.mode || "dir",
        mountPath: remountPathForRerun(m.mountPath, job),
        selected: m.mode === "files" ? (m.files || []).map((f) => f.path) : null,
        isPlatformGenerated: isPlatformGeneratedMountPath(remountPathForRerun(m.mountPath, job), job),
      })
    );
  }

  function mountsVisibleForTeam(teamId) {
    return visibleConfigSets().filter((s) => s.status === "active" && s.teamId === teamId);
  }

  function createMountConflictMap() {
    const map = {};
    createConfigMounts.forEach((m) => {
      const path = resolvedCreateMountPath(m);
      const hit = createConfigMounts.some((o) => o.uid !== m.uid && mountPathsConflict(path, resolvedCreateMountPath(o)));
      map[m.uid] = hit;
    });
    return map;
  }

  function resolvedCreateMountPath(m) {
    return normalizeMountPath(m?.mountPath || defaultConfigMountPath());
  }

  function filesForCreateMount(m) {
    const set = findConfigSet(m.setId);
    const ver =
      m.pinPolicy === "latest_at_submit" || m.version === "latest_at_submit"
        ? latestConfigVersion(set)
        : findConfigVersion(set, m.version);
    return ver?.files || [];
  }

  function selectedFilesForCreateMount(m) {
    const files = filesForCreateMount(m);
    if (m.mode !== "files") return files;
    if (!m.selected) return files;
    return files.filter((f) => m.selected.includes(f.path));
  }

  function snapshotMountsForSubmit() {
    return createConfigMounts
      .filter((m) => m.setId)
      .map((m) => {
        const set = findConfigSet(m.setId);
        const pinned =
          m.pinPolicy === "latest_at_submit" || m.version === "latest_at_submit"
            ? latestConfigVersion(set)
            : findConfigVersion(set, m.version);
        const files = selectedFilesForCreateMount(m).map((f) => ({
          path: f.path,
          kind: f.kind,
          content: f.content,
          size: configFileBytes(f),
        }));
        return {
          setId: set?.id,
          setName: set?.name,
          displayName: set?.displayName,
          version: pinned?.version,
          pinPolicy: "pinned",
          mode: m.mode,
          mountPath: resolvedCreateMountPath(m),
          isPlatformGenerated: !!m.isPlatformGenerated,
          digest: pinned?.digest || mockDigest(files),
          materialize: "configmap",
          files,
        };
      });
  }

  function renderCreateConfigMounts() {
    const host = $("#create-config-mounts");
    if (!host) return;
    const teamId = $("#create-team")?.value;
    const sets = mountsVisibleForTeam(teamId);
    const conflicts = createMountConflictMap();

    host.innerHTML = createConfigMounts
      .map((m) => {
        const set = findConfigSet(m.setId);
        const vers = [...(set?.versions || [])].sort((a, b) => b.version - a.version).slice(0, 20);
        const latest = latestConfigVersion(set);
        const files = filesForCreateMount(m);
        const conflict = conflicts[m.uid];
        const setOpts =
          `<option value="">选择配置集</option>` +
          sets
            .map((s) => `<option value="${s.id}" ${s.id === m.setId ? "selected" : ""}>${escapeHtml(s.displayName)}</option>`)
            .join("");
        const verOpts = set
          ? `<option value="latest_at_submit" ${m.pinPolicy === "latest_at_submit" ? "selected" : ""}>提交时最新（提交瞬间钉死，不会跟着改）</option>
             <option disabled>────────</option>
             ${vers
               .map((v) => {
                 const latestMark = v.version === latest?.version ? " · 当前最新" : "";
                 return `<option value="${v.version}" ${m.pinPolicy === "pinned" && Number(m.version) === v.version ? "selected" : ""}>v${v.version}${latestMark}</option>`;
               })
               .join("")}`
          : `<option value="">先选择配置集</option>`;
        const fileRows =
          m.mode === "files"
            ? `<div class="cfg-mount-files">
                ${files
                  .map((f) => {
                    const on = !m.selected || m.selected.includes(f.path);
                    const mp = `${resolvedCreateMountPath(m)}/${f.path}`;
                    return `<label class="cfg-mount-file-row">
                      <input type="checkbox" data-cfg-file-sel="${m.uid}" data-path="${escapeHtml(f.path)}" ${on ? "checked" : ""} />
                      <span class="mono">${escapeHtml(f.path)}</span>
                      <span class="mono text-muted">${escapeHtml(mp)}</span>
                    </label>`;
                  })
                  .join("")}
              </div>`
            : "";
        return `<div class="cfg-mount-card ${conflict ? "is-conflict" : ""}" data-mount-uid="${m.uid}">
          <div class="cfg-mount-card-head">
            <strong style="font-size:13px">配置集挂载</strong>
            <button type="button" class="btn btn-danger btn-sm" data-cfg-del-mount="${m.uid}">删除</button>
          </div>
          <div class="cfg-mount-grid">
            <div class="form-group">
              <label>配置集</label>
              <select data-cfg-set="${m.uid}">${setOpts}</select>
            </div>
            <div class="form-group">
              <label>版本</label>
              <select data-cfg-ver="${m.uid}">${verOpts}</select>
            </div>
            <div class="form-group">
              <label>挂载方式</label>
              <select data-cfg-mode="${m.uid}">
                <option value="dir" ${m.mode === "dir" ? "selected" : ""}>整包目录</option>
                <option value="files" ${m.mode === "files" ? "selected" : ""}>按文件</option>
              </select>
            </div>
            <div class="form-group full">
              <div class="field-label-row">
                <label>容器路径</label>
                <span class="cfg-mount-path-hint">挂载的配置将会覆盖同目录下的同名文件</span>
              </div>
              <input class="mono cfg-mount-path-input" data-cfg-path="${m.uid}" value="${escapeHtml(resolvedCreateMountPath(m))}" />
            </div>
            <div class="form-group full">${fileRows}</div>
          </div>
          ${conflict ? `<div class="cfg-mount-error">CONFIG_MOUNT_CONFLICT：挂载路径不得相等，也不得互为目录前缀</div>` : ""}
          ${
            set
              ? `<div class="cfg-mount-preview-wrap">
                  <button type="button" class="cfg-preview-btn${m.preview ? " is-open" : ""}" data-cfg-preview="${m.uid}" aria-expanded="${m.preview ? "true" : "false"}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      ${
                        m.preview
                          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>`
                          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
                      }
                    </svg>
                    <span>${m.preview ? "收起预览" : "预览文件"}</span>
                  </button>
                 ${
                   m.preview
                     ? codeBlockHtml(
                         selectedFilesForCreateMount(m)
                           .map((f) => `--- ${f.path} ---\n${f.content || ""}`)
                           .join("\n\n"),
                         "yaml",
                         "cfg-mount-preview"
                       )
                     : ""
                 }
                </div>`
              : ""
          }
        </div>`;
      })
      .join("");

    $$("[data-cfg-set]").forEach((el) => {
      el.addEventListener("change", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgSet);
        if (!m) return;
        m.setId = el.value;
        m.version = "latest_at_submit";
        m.pinPolicy = "latest_at_submit";
        m.selected = null;
        renderCreateConfigMounts();
        updateCreateSummary();
      });
    });
    $$("[data-cfg-ver]").forEach((el) => {
      el.addEventListener("change", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgVer);
        if (!m) return;
        if (el.value === "latest_at_submit") {
          m.version = "latest_at_submit";
          m.pinPolicy = "latest_at_submit";
        } else {
          m.version = Number(el.value);
          m.pinPolicy = "pinned";
        }
        m.selected = null;
        renderCreateConfigMounts();
        updateCreateSummary();
      });
    });
    $$("[data-cfg-mode]").forEach((el) => {
      el.addEventListener("change", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgMode);
        if (!m) return;
        m.mode = el.value;
        if (m.mode === "files") m.selected = filesForCreateMount(m).map((f) => f.path);
        renderCreateConfigMounts();
        updateCreateSummary();
      });
    });
    $$("[data-cfg-path]").forEach((el) => {
      el.addEventListener("change", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgPath);
        if (!m) return;
        const next = normalizeMountPath(el.value.trim() || defaultConfigMountPath());
        m.mountPath = next;
        m.isPlatformGenerated = next === defaultConfigMountPath();
        renderCreateConfigMounts();
        updateCreateSummary();
      });
    });
    $$("[data-cfg-del-mount]").forEach((el) => {
      el.addEventListener("click", () => openUnmountConfirm(el.dataset.cfgDelMount));
    });
    $$("[data-cfg-preview]").forEach((el) => {
      el.addEventListener("click", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgPreview);
        if (!m) return;
        m.preview = !m.preview;
        renderCreateConfigMounts();
      });
    });
    $$("[data-cfg-file-sel]").forEach((el) => {
      el.addEventListener("change", () => {
        const m = createConfigMounts.find((x) => x.uid === el.dataset.cfgFileSel);
        if (!m) return;
        const all = filesForCreateMount(m).map((f) => f.path);
        const on = new Set(m.selected || all);
        if (el.checked) on.add(el.dataset.path);
        else on.delete(el.dataset.path);
        m.selected = [...on];
        updateCreateSummary();
      });
    });

    updateCreateConfigHint();
  }

  function updateCreateConfigHint() {
    const hint = $("#create-config-hint");
    if (!hint) return;
    const command = $("#create-command")?.value || "";
    if (!commandNeedsConfigsHint(command) || createConfigMounts.length === 0) {
      hint.hidden = true;
      hint.textContent = "";
      return;
    }
    const paths = createConfigMounts.map(resolvedCreateMountPath);
    const def = defaultConfigMountPath();
    const hasDefault = paths.some((p) => normalizeMountPath(p) === def);
    if (hasDefault) {
      hint.hidden = true;
      hint.textContent = "";
    } else {
      hint.hidden = false;
      hint.textContent = `启动命令引用了相对路径 configs/，当前挂载不在 ${CONFIG_MOUNT_PATH_PATTERN}。请改用绝对 --config，或改回平台默认路径。`;
    }
  }

  function openUnmountConfirm(uid) {
    const m = createConfigMounts.find((x) => x.uid === uid);
    if (!m) return;
    pendingUnmountUid = uid;
    const set = findConfigSet(m.setId);
    const label = set?.displayName || set?.name || "未选择配置集";
    const nameEl = $("#modal-cfg-unmount-name");
    if (nameEl) nameEl.textContent = label;
    $("#modal-cfg-unmount")?.classList.add("show");
  }

  function closeUnmountConfirm() {
    $("#modal-cfg-unmount")?.classList.remove("show");
    pendingUnmountUid = null;
  }

  function confirmUnmount() {
    if (!pendingUnmountUid) return closeUnmountConfirm();
    createConfigMounts = createConfigMounts.filter((x) => x.uid !== pendingUnmountUid);
    closeUnmountConfirm();
    renderCreateConfigMounts();
    syncCreateConfigAddButton();
    updateCreateSummary();
    toast("已删除配置挂载");
  }

  function addCreateConfigMount() {
    createConfigMounts.push(newCreateMount());
    renderCreateConfigMounts();
    syncCreateConfigAddButton();
    updateCreateSummary();
  }

  /* ---------- Job Create / Rerun ---------- */
  const CREATE_DEFAULTS = {
    name: "slm-7b-pretrain-phase4",
    teamId: "team-slm",
    queueId: "q-slm-js-h100",
    priority: "P2",
    nodes: "8",
    gpusPerNode: "8",
    gpuType: "H100-80G",
    image: "harbor.msxf.com/ai/megatron:24.07-cuda12.4",
    command:
      "torchrun --nproc_per_node=$GPU_NUM --nnodes=$WORLD_SIZE --node_rank=$RANK --master_addr=$MASTER_ADDR --master_port=$MASTER_PORT torch_ddp_cifar10.py",
    env: "EPOCHS=1000\nMODEL_SAVE_PATH=/data/hpc/home/admin/workspace/aihpc/ddp/output/cifar10.pth\nNCCL_IB_DISABLE=0\nNCCL_DEBUG=INFO",
  };

  const NETWORK_DISK_ROOTS = (MOCK.networkDisk && MOCK.networkDisk.roots) || ["/share", "/data/hpc/home"];
  const LEGACY_PATH_PREFIXES = (MOCK.networkDisk && MOCK.networkDisk.legacyPrefixes) || [
    "/data/jiangsu",
    "/data/liangjiang",
    "/data/shuitu",
    "/mnt/shared",
    "/mnt/data",
    "/mnt/ckpt",
    "/data/home",
  ];
  const PATH_MISSING_HINT = "请先把数据拷到 /share/... 或 /data/hpc/home/<user>/...，平台不会代为下载";

  function pathSlug(taskName) {
    return (
      String(taskName || "unnamed")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "unnamed"
    );
  }

  /** 工作路径默认：/data/hpc/home/<运行用户账号>，用户可改；管理员未指定运行用户时留空 */
  function defaultWorkdir(username) {
    const user = username || currentConfigUsername();
    if (!user) return "";
    return `/data/hpc/home/${user}`;
  }

  function createWorkdirPlaceholder() {
    const user = currentConfigUsername();
    return user ? `/data/hpc/home/${user}` : "/data/hpc/home/<运行用户>";
  }

  function syncCreateWorkdirHelp() {
    const tip = document.querySelector('button.field-help[aria-label="工作路径说明"]');
    const sample = createWorkdirPlaceholder();
    if (tip) {
      tip.setAttribute(
        "data-tip",
        `容器内训练进程的工作路径。默认 ${sample}，可按任务修改，平台不限制路径前缀。`
      );
    }
    const el = $("#create-workdir");
    if (el) el.placeholder = sample;
  }

  /** 原任务展示用：旧 outputs 约定路径归一成用户家目录 */
  function jobWorkdirDisplay(job) {
    const wd = String(job?.workdir || "").trim();
    const home = defaultWorkdir(usernameForJob(job));
    if (!wd || wd === "-") return home;
    const n = normalizeMountPath(wd);
    if (/^\/data\/hpc\/home\/[^/]+\/outputs(\/|$)/.test(n)) {
      const user = n.split("/")[4];
      return `/data/hpc/home/${user}`;
    }
    return wd;
  }

  /** 历史约定路径（重跑识别旧任务自动生成的挂载点） */
  function conventionPaths(taskName, username) {
    const user = username || currentConfigUsername();
    const slug = pathSlug(taskName);
    return {
      workdir: `/data/hpc/home/${user}/outputs/${slug}`,
      ckpt: `/data/hpc/home/${user}/outputs/${slug}/checkpoints`,
      dataPath: "/share/slm/datasets/mix-v3",
    };
  }

  function isAllowedNetworkPath(path) {
    const n = normalizeMountPath(path);
    return NETWORK_DISK_ROOTS.some((root) => n === root || n.startsWith(`${root}/`));
  }

  function isLegacyDiskPath(path) {
    const n = normalizeMountPath(path);
    return LEGACY_PATH_PREFIXES.some((root) => n === root || n.startsWith(`${root}/`));
  }

  function lookupClusterPath(path) {
    const raw = normalizeMountPath(path);
    const dirs = (MOCK.networkDisk && MOCK.networkDisk.dirs) || {};
    if (dirs[raw]) return { ...dirs[raw], exact: true };
    let n = raw;
    const seen = new Set();
    while (n && n !== "/" && !seen.has(n)) {
      seen.add(n);
      if (dirs[n]) {
        return { exists: !!dirs[n].exists, readable: !!dirs[n].readable, empty: false, inherited: true };
      }
      n = n.replace(/\/[^/]+$/, "") || "/";
    }
    const home = raw.match(/^\/data\/hpc\/home\/[^/]+/);
    if (home && dirs[home[0]]) {
      return { exists: true, readable: true, empty: false, inferred: true };
    }
    return { exists: false, readable: false, empty: true };
  }

  function validateTrainPath(path, kind) {
    const label =
      kind === "data" ? "数据路径" : kind === "workdir" ? "工作路径" : kind === "ckpt" ? "断点目录" : "加载路径";
    const required = kind !== "load";
    const trimmed = String(path || "").trim();
    if (!trimmed) {
      return required ? [{ level: "error", code: "required", message: `请填写${label}` }] : [];
    }
    if (isLegacyDiskPath(trimmed)) {
      return [
        {
          level: "error",
          code: "legacy",
          message: `${label}使用了已废弃盘符。各机房统一挂 /share 与 /data/hpc/home，请改路径。${PATH_MISSING_HINT}。`,
        },
      ];
    }
    if (!isAllowedNetworkPath(trimmed)) {
      return [{ level: "error", code: "prefix", message: `${label}必须落在 /share 或 /data/hpc/home 下。` }];
    }
    const fs = lookupClusterPath(trimmed);
    if (!fs.exists) {
      return [{ level: "error", code: "missing", message: `${label}在目标集群上不存在。${PATH_MISSING_HINT}。` }];
    }
    if (!fs.readable) {
      return [{ level: "error", code: "unreadable", message: `${label}在目标集群上不可读。` }];
    }
    if (kind === "data" && fs.empty) {
      return [{ level: "error", code: "empty", message: "数据目录为空。请确认已从金融云生产拷到网络盘。" }];
    }
    const okMsg =
      kind === "data"
        ? "目标集群上目录存在、可读、非空"
        : fs.inferred
          ? "落在个人网络盘约定目录"
          : "目标集群上目录存在、可读";
    return [{ level: "ok", code: "ok", message: okMsg }];
  }

  function collectCreateMountedFiles() {
    const files = [];
    (createConfigMounts || []).forEach((m) => {
      selectedFilesForCreateMount(m).forEach((f) => files.push(f));
    });
    return files;
  }

  function extractAbsolutePathsFromText(text) {
    const paths = [];
    const re = /(?:^|[\s="'`])(\/(?:share|data|mnt)[^\s"',`]+)/g;
    let m;
    while ((m = re.exec(String(text || "")))) {
      paths.push(m[1].replace(/[\\,]+$/, ""));
    }
    return paths;
  }

  function collectCreatePathIssues() {
    const issues = [];
    extractAbsolutePathsFromText($("#create-command")?.value || "").forEach((p) => {
      validateTrainPath(p, "data")
        .filter((x) => x.level === "error" && x.code !== "required")
        .forEach((x) => issues.push({ ...x, message: `启动命令中的路径：${x.message}` }));
    });
    collectCreateMountedFiles().forEach((f) => {
      extractAbsolutePathsFromText(f.content).forEach((p) => {
        const kind = /save|ckpt|checkpoint|output/i.test(p + f.path) ? "ckpt" : "data";
        validateTrainPath(p, kind)
          .filter((x) => x.level === "error" && x.code !== "required")
          .forEach((x) => issues.push({ ...x, message: `配置 ${f.path}：${x.message}` }));
      });
    });
    return issues;
  }

  function setPathCheck(sel, results) {
    const el = $(sel);
    if (!el) return;
    const err = (results || []).find((r) => r.level === "error");
    el.classList.remove("is-ok", "is-err", "is-empty");
    if (!results || !results.length) {
      el.textContent = "";
      el.classList.add("is-empty");
      return;
    }
    if (err) {
      el.classList.add("is-err");
      el.textContent = err.message;
    } else {
      el.textContent = "";
      el.classList.add("is-empty");
    }
  }

  function refreshCreatePathChecks() {
    /* 工作路径不做自动校验，用户填写任意路径均可提交 */
  }

  function syncDefaultWorkdir() {
    const el = $("#create-workdir");
    if (!el) return;
    const next = defaultWorkdir();
    const current = el.value.trim();
    if (!current || current === lastCreateWorkdirDefault) el.value = next;
    lastCreateWorkdirDefault = next;
  }

  function envToText(env) {
    if (!env || typeof env !== "object") return "";
    return Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
  }

  function parseEnvText(text) {
    const env = {};
    (text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const i = line.indexOf("=");
        if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
    return env;
  }

  /** 每节点 GPU 数合法范围 1–8 */
  const GPUS_PER_NODE_MAX = 8;

  function clampGpusPerNode(val) {
    const n = Math.floor(Number(val));
    if (!Number.isFinite(n) || n < 1) return "";
    return String(Math.min(GPUS_PER_NODE_MAX, n));
  }

  function cpuMemDefaultsOf(gpn, gpuType) {
    const spec = gpuResSpecOf(gpuType);
    const g = Math.max(0, Math.floor(Number(gpn) || 0));
    return {
      cpuPerGpu: spec.cpuPerGpu,
      memGiPerGpu: spec.memGiPerGpu,
      cpuPerNode: g * spec.cpuPerGpu,
      memGiPerNode: g * spec.memGiPerGpu,
    };
  }

  function readCreateCpuPerNode() {
    const n = Math.floor(Number($("#create-cpu-per-node")?.value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function readCreateMemPerNode() {
    const n = Math.floor(Number($("#create-mem-per-node")?.value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function createJobResourceRequest() {
    const nodes = +($("#create-nodes")?.value || 0);
    const gpn = +($("#create-gpus-per-node")?.value || 0);
    const q = findQueue($("#create-queue")?.value);
    const gpuType = q?.gpuType || $("#create-gpu-type")?.value || "—";
    const cpuPerNode = readCreateCpuPerNode();
    const memGiPerNode = readCreateMemPerNode();
    const totalGpus = nodes > 0 && gpn > 0 ? nodes * gpn : null;
    const totalCpu = nodes > 0 && cpuPerNode > 0 ? nodes * cpuPerNode : null;
    const totalMemGi = nodes > 0 && memGiPerNode > 0 ? nodes * memGiPerNode : null;
    const defaults = cpuMemDefaultsOf(gpn, gpuType);
    const isDefault =
      cpuPerNode > 0 &&
      memGiPerNode > 0 &&
      cpuPerNode === defaults.cpuPerNode &&
      memGiPerNode === defaults.memGiPerNode;
    return {
      nodes,
      gpn,
      gpuType,
      cpuPerNode,
      memGiPerNode,
      totalGpus,
      totalCpu,
      totalMemGi,
      defaults,
      isDefault,
      q,
    };
  }

  function applyCreateCpuMemDefaults(opts = {}) {
    if (!opts.force && createCpuMemManual) return;
    const gpn = +($("#create-gpus-per-node")?.value || 0);
    const gpuType =
      $("#create-gpu-type")?.value || findQueue($("#create-queue")?.value)?.gpuType;
    if (!gpn || !gpuType) return;
    const d = cpuMemDefaultsOf(gpn, gpuType);
    if (!d.cpuPerNode || !d.memGiPerNode) return;
    const cpuEl = $("#create-cpu-per-node");
    const memEl = $("#create-mem-per-node");
    if (cpuEl) cpuEl.value = String(d.cpuPerNode);
    if (memEl) memEl.value = String(d.memGiPerNode);
    if (opts.force) createCpuMemManual = false;
  }

  function syncCreateCpuMemManualFlag() {
    const gpn = +($("#create-gpus-per-node")?.value || 0);
    const gpuType =
      $("#create-gpu-type")?.value || findQueue($("#create-queue")?.value)?.gpuType;
    if (!gpn || !gpuType) return;
    const d = cpuMemDefaultsOf(gpn, gpuType);
    const cpu = readCreateCpuPerNode();
    const mem = readCreateMemPerNode();
    createCpuMemManual = cpu !== d.cpuPerNode || mem !== d.memGiPerNode;
  }

  function bindCreateCpuMemInputs() {
    ["create-cpu-per-node", "create-mem-per-node"].forEach((id) => {
      const input = $(`#${id}`);
      if (!input || input.dataset.boundCpuMem === "1") return;
      input.dataset.boundCpuMem = "1";
      const clamp = (e) => {
        if (input.value === "" || input.value === null) {
          createCpuMemManual = true;
          updateCreateSummary();
          return;
        }
        const raw = Number(input.value);
        if (!Number.isFinite(raw)) return;
        if (raw < 1 && e?.type !== "input") {
          input.value = "1";
        } else if (raw >= 1) {
          input.value = String(Math.floor(raw));
        }
        syncCreateCpuMemManualFlag();
        updateCreateSummary();
      };
      input.addEventListener("input", clamp);
      input.addEventListener("change", clamp);
      input.addEventListener("blur", clamp);
    });
  }

  function syncCreateCpuMemResetUi() {
    const btn = $("#btn-reset-cpu-mem");
    if (!btn) return;
    const req = createJobResourceRequest();
    const show = req.cpuPerNode > 0 && req.memGiPerNode > 0 && !req.isDefault;
    btn.classList.toggle("hidden", !show);
    if (btn.dataset.boundReset === "1") return;
    btn.dataset.boundReset = "1";
    btn.addEventListener("click", () => {
      applyCreateCpuMemDefaults({ force: true });
      updateCreateSummary();
    });
  }

  function bindGpusPerNodeInput() {
    const input = $("#create-gpus-per-node");
    if (!input || input.dataset.boundGpn === "1") return;
    input.dataset.boundGpn = "1";
    input.setAttribute("min", "1");
    input.setAttribute("max", String(GPUS_PER_NODE_MAX));
    const clamp = (e) => {
      if (input.value === "" || input.value === null) return;
      const raw = Number(input.value);
      if (!Number.isFinite(raw)) return;
      if (raw > GPUS_PER_NODE_MAX) {
        input.value = String(GPUS_PER_NODE_MAX);
        // 仅在失焦/变更时提示，避免输入过程反复 toast
        if (e?.type === "change" || e?.type === "blur") {
          toast(`每节点 GPU 数最大为 ${GPUS_PER_NODE_MAX}`, "warning");
        }
      } else if (raw < 1 && e?.type !== "input") {
        input.value = "1";
      } else if (raw >= 1) {
        input.value = String(Math.floor(raw));
      }
      applyCreateCpuMemDefaults();
      updateCreateSummary();
    };
    input.addEventListener("input", clamp);
    input.addEventListener("change", clamp);
    input.addEventListener("blur", clamp);
  }

  function gpusPerNodeOf(job) {
    if (!job?.nodes || !job?.gpus) return GPUS_PER_NODE_MAX;
    return Math.min(GPUS_PER_NODE_MAX, Math.max(1, Math.round(job.gpus / job.nodes)));
  }

  /** 算法用户自行编译后粘贴的 Harbor 镜像地址 */
  function readCreateImage() {
    return ($("#create-image")?.value || "").trim();
  }

  function isCreateImageRef(value) {
    const s = String(value || "").trim();
    if (!s || /\s/.test(s)) return false;
    return s.includes("/") && !s.startsWith("/") && !s.endsWith("/");
  }

  function fillCreateForm(values) {
    if ($("#create-name")) $("#create-name").value = values.name ?? "";
    if ($("#create-nodes")) $("#create-nodes").value = values.nodes ?? "";
    if ($("#create-gpus-per-node")) {
      const raw = values.gpusPerNode ?? "";
      const clamped = clampGpusPerNode(raw);
      $("#create-gpus-per-node").value = clamped !== "" ? clamped : raw === "" ? "" : String(GPUS_PER_NODE_MAX);
    }
    if ($("#create-gpu-type") && values.gpuType) $("#create-gpu-type").value = values.gpuType;
    if ($("#create-cpu-per-node") && values.cpuPerNode != null && values.cpuPerNode !== "") {
      $("#create-cpu-per-node").value = String(values.cpuPerNode);
    }
    if ($("#create-mem-per-node") && values.memGiPerNode != null && values.memGiPerNode !== "") {
      $("#create-mem-per-node").value = String(values.memGiPerNode);
    }
    if ($("#create-image") && values.image != null) {
      $("#create-image").value = values.image;
    }
    if ($("#create-command")) $("#create-command").value = values.command ?? "";
    if ($("#create-env")) $("#create-env").value = values.env ?? "";
    if ($("#create-workdir")) {
      $("#create-workdir").placeholder = createWorkdirPlaceholder();
      $("#create-workdir").value = values.workdir ?? defaultWorkdir();
    }
    if (values.teamId && $("#create-team")) {
      $("#create-team").value = values.teamId;
    }
    if (values.queueId && $("#create-queue")) {
      $("#create-queue").value = values.queueId;
    }
    if (values.priority) setCreatePriority(values.priority);
    else syncCreatePriorityUi();
  }

  function populateCreateTeamOptions(selectedId) {
    const teams = teamsForJobCreate();
    const sel = $("#create-team");
    if (!sel) return teams;
    // 同步帮助文案
    const teamHelp = document.querySelector('button.field-help[aria-label="所属团队说明"]');
    if (teamHelp) {
      teamHelp.setAttribute(
        "data-tip",
        isPlatformAdmin()
          ? "平台管理员可选择全部团队"
          : "仅展示当前用户已加入的团队"
      );
    }
    if (!teams.length) {
      sel.innerHTML = isPlatformAdmin()
        ? `<option value="">暂无团队，请先在「团队管理」中创建</option>`
        : `<option value="">无可用团队（请联系管理员加入团队）</option>`;
      return teams;
    }
    sel.innerHTML = teams
      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
      .join("");
    const prefer = selectedId && teams.some((p) => p.id === selectedId) ? selectedId : teams[0].id;
    sel.value = prefer;
    return teams;
  }

  function populateCreateQueueOptions(teamId, selectedQueueId) {
    const sel = $("#create-queue");
    if (!sel) return [];
    const admin = isPlatformAdmin();
    const queues = queuesForTeam(teamId, { forAdmin: admin });
    const queueHelp = document.querySelector('button.field-help[aria-label="资源队列说明"]');
    if (queueHelp) {
      queueHelp.setAttribute(
        "data-tip",
        admin
          ? "平台管理员可选择该团队关联的全部资源队列"
          : "队列绑定数据中心、GPU 型号与额度，仅展示当前团队已启用的队列"
      );
    }
    if (!queues.length) {
      sel.innerHTML = `<option value="">该团队未关联队列</option>`;
      return [];
    }
    // 管理员优先选已启用队列；若全禁用则仍列出
    const enabledQueues = queues.filter((q) => isQueueEnabled(q));
    sel.innerHTML = queues
      .map((q) => {
        const free = queueGpuFree(q);
        const disabledMark = isQueueEnabled(q) ? "" : " · 已禁用";
        const ibMark = queueSupportsIB(q) ? " · [IB]" : "";
        return `<option value="${q.id}" ${!isQueueEnabled(q) ? 'data-disabled="1"' : ""}>${escapeHtml(q.displayName || q.name)} · 剩余 ${free} × ${escapeHtml(q.gpuType || "")}${ibMark}${disabledMark}</option>`;
      })
      .join("");
    const preferList = enabledQueues.length ? enabledQueues : queues;
    const prefer =
      selectedQueueId && queues.some((q) => q.id === selectedQueueId)
        ? selectedQueueId
        : preferList[0].id;
    sel.value = prefer;
    return queues;
  }

  function syncCreateFromQueue() {
    const q = findQueue($("#create-queue")?.value);
    if (!q) {
      const panel = $("#create-queue-quota");
      if (panel) panel.innerHTML = `<div class="empty-state" style="padding:16px">请选择资源队列以查看额度与 IB 能力</div>`;
      return;
    }
    const gpuTypeSel = $("#create-gpu-type");
    if (gpuTypeSel) {
      if (![...gpuTypeSel.options].some((o) => o.value === q.gpuType)) {
        const opt = document.createElement("option");
        opt.value = q.gpuType;
        opt.textContent = q.gpuType;
        gpuTypeSel.appendChild(opt);
      }
      gpuTypeSel.value = q.gpuType;
    }
    // IB 能力完全由队列功能特性决定，创建页不再提供勾选项
    renderCreateQueueQuota(q);
    applyCreateCpuMemDefaults();
  }

  function queueCpuFree(q) {
    return Math.max(0, (q?.cpuQuota || 0) - (q?.cpuUsed || 0));
  }

  function queueMemFree(q) {
    return Math.max(0, (q?.memQuotaGi || 0) - (q?.memUsedGi || 0));
  }

  function renderCreateQueueQuota(q) {
    const panel = $("#create-queue-quota");
    if (!panel) return;
    if (!q) {
      panel.innerHTML = "";
      return;
    }
    const supportsIB = queueSupportsIB(q);
    const gpuUsed = q.gpuUsed || 0;
    const gpuTotal = q.gpuQuota || 0;
    const gpuFree = queueGpuFree(q);
    const gpuPct = queueUtilPct(q);
    const cpuUsed = q.cpuUsed || 0;
    const cpuTotal = q.cpuQuota || 0;
    const cpuFree = queueCpuFree(q);
    const cpuPct = cpuTotal > 0 ? Math.min(100, Math.round((cpuUsed / cpuTotal) * 100)) : 0;
    const memUsed = q.memUsedGi || 0;
    const memTotal = q.memQuotaGi || 0;
    const memFree = queueMemFree(q);
    const memUnit = memUnitFor([memUsed, memTotal, memFree]);
    const memPct = memTotal > 0 ? Math.min(100, Math.round((memUsed / memTotal) * 100)) : 0;
    panel.innerHTML = `
      <div class="queue-quota-card">
        <div class="queue-ib-capability ${supportsIB ? "is-on" : "is-off"}" role="status" aria-live="polite">
          <div class="queue-ib-capability-icon" aria-hidden="true">
            ${
              supportsIB
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h3l2-7 4 14 2-7h5"/><circle cx="12" cy="12" r="10" opacity="0.25"/></svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>`
            }
          </div>
          <div class="queue-ib-capability-body">
            <div class="queue-ib-capability-title">${supportsIB ? "该队列支持 IB 高速网络" : "该队列不支持 IB"}</div>
            <div class="queue-ib-capability-desc">
              ${
                supportsIB
                  ? "任务将调度至具备 InfiniBand 的节点，多机 NCCL 走 RDMA，并尽量落在同一 IB 拓扑域。"
                  : "当前队列未开启 IB 功能特性，任务将按普通网络调度。如需 IB，请切换到支持 IB 的资源队列。"
              }
            </div>
          </div>
          <span class="queue-ib-capability-badge">${supportsIB ? "IB 已启用" : "无 IB"}</span>
        </div>
        <div class="queue-quota-meta-row">
          <span class="queue-quota-usage-title">资源分配情况</span>
          <div class="queue-quota-meta-tags">
            ${dcBadge(q.dc)}
            <span class="tag">${escapeHtml(q.gpuType || "—")}</span>
            ${renderQueueFeatureTags(q)}
          </div>
        </div>
        <div class="queue-quota-usage">
          <div class="queue-quota-usage-item">
            <div class="queue-capacity-bar-label">
              <span>GPU</span>
              <span class="mono">
                已用 <strong>${gpuUsed}</strong> / ${gpuTotal} 卡
                · 剩余 <strong class="${gpuFree ? "text-success" : "text-danger"}">${gpuFree}</strong>
                · ${gpuPct}%
              </span>
            </div>
            <div class="capacity-track" role="progressbar" aria-valuenow="${gpuPct}" aria-valuemin="0" aria-valuemax="100">
              <div class="capacity-fill ${quotaBarClass(gpuPct)}" style="width:${gpuPct}%"></div>
            </div>
          </div>
          <div class="queue-quota-usage-item">
            <div class="queue-capacity-bar-label">
              <span>CPU</span>
              <span class="mono">
                已用 <strong>${cpuUsed}</strong> / ${cpuTotal} 核
                · 剩余 <strong class="${cpuFree ? "text-success" : "text-danger"}">${cpuFree}</strong>
                · ${cpuPct}%
              </span>
            </div>
            <div class="capacity-track" role="progressbar" aria-valuenow="${cpuPct}" aria-valuemin="0" aria-valuemax="100">
              <div class="capacity-fill ${quotaBarClass(cpuPct)}" style="width:${cpuPct}%"></div>
            </div>
          </div>
          <div class="queue-quota-usage-item">
            <div class="queue-capacity-bar-label">
              <span>内存</span>
              <span class="mono">
                已用 <strong>${formatMemAmountWithUnit(memUsed, memUnit)}</strong> / ${formatMemAmountWithUnit(memTotal, memUnit)}
                · 剩余 <strong class="${memFree ? "text-success" : "text-danger"}">${formatMemAmountWithUnit(memFree, memUnit)}</strong>
                · ${memPct}%
              </span>
            </div>
            <div class="capacity-track" role="progressbar" aria-valuenow="${memPct}" aria-valuemin="0" aria-valuemax="100">
              <div class="capacity-fill ${quotaBarClass(memPct)}" style="width:${memPct}%"></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function visibleCreateFormTabs() {
    return rerunFromJobId ? [...CREATE_FORM_TABS, "source"] : CREATE_FORM_TABS.slice();
  }

  function highlightCreateFormTab(tab) {
    createFormTab = tab;
    $$("#create-form-tabs [data-create-tab]").forEach((el) => {
      const on = el.dataset.createTab === tab;
      el.classList.toggle("active", on);
      el.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function createFormSectionEl(tab) {
    return $(`#create-form-panels > [data-panel="${tab}"]`);
  }

  function scrollToCreateSection(tab) {
    const panel = createFormSectionEl(tab);
    if (!panel || panel.classList.contains("hidden")) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    createFormScrollLock += 1;
    panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => {
      createFormScrollLock = Math.max(0, createFormScrollLock - 1);
    }, reduce ? 80 : 700);
  }

  function switchCreateFormTab(tab, opts = {}) {
    const allowed = visibleCreateFormTabs();
    if (!allowed.includes(tab)) tab = allowed[0] || "basic";
    highlightCreateFormTab(tab);
    const sourcePanel = $("#rerun-source-section");
    sourcePanel?.classList.toggle("hidden", !allowed.includes("source"));
    if (opts.scroll !== false) scrollToCreateSection(tab);
    syncCreateTabMeta();
  }

  function syncCreateFormTabFromScroll() {
    const page = $("#page-job-create");
    const tabsEl = $("#create-form-tabs");
    if (!page?.classList.contains("active") || !tabsEl) return;
    const topbarBottom = $(".topbar")?.getBoundingClientRect().bottom || 56;
    tabsEl.classList.toggle("is-stuck", tabsEl.getBoundingClientRect().top <= topbarBottom + 0.5);
    if (createFormScrollLock) return;
    const offset = tabsEl.getBoundingClientRect().bottom + 12;
    const allowed = visibleCreateFormTabs();
    let current = allowed[0];
    for (const key of allowed) {
      const el = createFormSectionEl(key);
      if (!el || el.classList.contains("hidden")) continue;
      if (el.getBoundingClientRect().top <= offset) current = key;
    }
    if (current && current !== createFormTab) highlightCreateFormTab(current);
  }

  function syncCreateTabMeta() {
    const name = $("#create-name")?.value?.trim() || "";
    const team = $("#create-team")?.value;
    const queue = $("#create-queue")?.value;
    const nodes = +($("#create-nodes")?.value || 0);
    const gpn = +($("#create-gpus-per-node")?.value || 0);
    const cpuPn = readCreateCpuPerNode();
    const memPn = readCreateMemPerNode();
    const cmd = ($("#create-command")?.value || "").trim();
    const image = readCreateImage();
    const mounts = createConfigMounts.filter((m) => m.setId).length;
    const workdir = ($("#create-workdir")?.value || "").trim();
    const runUserOk = !isPlatformAdmin() || !!selectedCreateRunUser();
    const basicDone = !!name && !!workdir && runUserOk;
    const resDone = nodes >= 1 && gpn >= 1 && cpuPn >= 1 && memPn >= 1 && !!(team && queue);
    const launchDone = !!cmd && isCreateImageRef(image);
    const setMeta = (key, text, done) => {
      $(`#create-form-tabs [data-create-tab="${key}"]`)?.classList.toggle("is-done", !!done);
      const meta = $(`[data-create-tab-meta="${key}"]`);
      if (meta) meta.textContent = text;
    };
    setMeta(
      "basic",
      !name
        ? isPlatformAdmin()
          ? "名称 / 运行用户 / 工作路径"
          : "名称 / 工作路径"
        : name,
      basicDone
    );
    setMeta(
      "resources",
      resDone ? `${nodes} 节点 · ${gpn} GPU · ${cpuPn} 核/节点` : "团队 / 队列 / 规格",
      resDone && !!(team && queue)
    );
    setMeta("launch", launchDone ? "已填写镜像与启动命令" : "镜像 / 命令 / 环境", launchDone);
    setMeta("configs", mounts ? `${mounts} 个配置集` : "可选", mounts > 0);
  }

  function sourceMountSummaryHtml(job) {
    const mounts = job?.configMounts || [];
    if (!mounts.length) {
      return `<div class="summary-row"><span class="k">配置集</span><span class="v text-muted">— 未挂载</span></div>`;
    }
    return mounts
      .map((m) => {
        const files = m.files || [];
        const bytes = files.reduce((s, f) => s + configFileBytes(f), 0);
        const name = m.displayName || m.setName || m.setId || "配置集";
        const path = m.mountPath || "—";
        return `<div class="summary-row"><span class="k">${escapeHtml(name)}</span><span class="v">v${escapeHtml(String(m.version ?? "—"))}</span></div>
          <div class="summary-row"><span class="k">路径</span><span class="v mono summary-ellipsis" title="${escapeHtml(path)}">${escapeHtml(path)}</span></div>
          <div class="summary-row"><span class="k">文件</span><span class="v">${files.length} 个 · ${formatBytes(bytes)}</span></div>
          ${files
            .map((f) => `<div class="summary-row"><span class="k"></span><span class="v mono summary-ellipsis">${escapeHtml(f.path || "")}</span></div>`)
            .join("")}`;
      })
      .join("");
  }

  function sourceEnvBlockHtml(env) {
    const text = envToText(env).trim();
    if (!text) {
      return `<div class="summary-cmd-k">环境变量</div><div class="summary-cmd-empty">无额外环境变量</div>`;
    }
    return `<div class="summary-cmd-k">环境变量</div>
      <pre class="summary-cmd-body">${highlightSource(text, "env")}</pre>`;
  }

  function renderRerunSourceInfo(source) {
    const el = $("#rerun-source-info");
    if (!el || !source) return;
    const q = findQueue(source.queueId || source.queue);
    const team = findTeam(source.teamId);
    const requireIB = source.requireIB != null ? !!source.requireIB : !!(q && queueSupportsIB(q));
    const pDef = jobPriorityDef(source.priority);
    const res = jobResourcesOf(source);
    const nodes = Number(source.nodes || res.nodes || 0) || 1;
    const gpn = gpusPerNodeOf(source);
    const cpuPerNode = Math.max(1, Math.round(res.cpus / nodes));
    const memPerNode = Math.max(1, Math.round(res.memGi / nodes));
    const image = source.image || "—";
    const imageShort = String(image).split("/").pop() || "—";
    const workdir = jobWorkdirDisplay(source);
    const queueLabel = q?.displayName || q?.name || source.queue || "—";
    const failTip = jobFailReason(source);

    el.innerHTML = `
      <div class="summary-status">
        <span class="summary-status-badge is-rerun">原任务</span>
        ${jobStatusBadge(source)}
        <span class="mono text-muted summary-status-src" title="${escapeHtml(source.id)}">${escapeHtml(source.id)}</span>
      </div>
      <div class="rerun-source-cols">
        <div>
          ${summaryStaticSection(
            "基本信息",
            `<div class="summary-row"><span class="k">任务名称</span><span class="v" title="${escapeHtml(source.name || "")}">${escapeHtml(source.name || "—")}</span></div>
            <div class="summary-row"><span class="k">创建人</span><span class="v">${escapeHtml(source.owner || "—")}${
              source.ownerUsername ? ` · ${escapeHtml(source.ownerUsername)}` : ""
            }</span></div>
            <div class="summary-row"><span class="k">团队</span><span class="v">${escapeHtml(team?.name || source.teamName || "—")}</span></div>
            <div class="summary-row"><span class="k">队列</span><span class="v" title="${escapeHtml(queueLabel)}">${escapeHtml(queueLabel)}</span></div>
            <div class="summary-row"><span class="k">优先级</span><span class="v">${renderJobPriorityBadge(source.priority)} <span class="text-muted" style="font-size:11.5px;margin-left:4px">${escapeHtml(pDef.desc)}</span></span></div>
            <div class="summary-row"><span class="k">数据中心</span><span class="v">${dcName(source.dc || q?.dc)}</span></div>
            <div class="summary-row"><span class="k">队列 IB</span><span class="v"><span class="summary-ib-pill ${requireIB ? "is-on" : "is-off"}">${requireIB ? "支持 IB" : "不支持 IB"}</span></span></div>
            <div class="summary-row"><span class="k">创建时间</span><span class="v mono">${escapeHtml(source.createdAt || "—")}</span></div>
            <div class="summary-row"><span class="k">启动时间</span><span class="v mono">${escapeHtml(source.startedAt && source.startedAt !== "-" ? source.startedAt : "—")}</span></div>
            <div class="summary-row"><span class="k">运行时长</span><span class="v mono">${escapeHtml(source.duration && source.duration !== "-" ? source.duration : "—")}</span></div>
            ${
              failTip
                ? `<div class="summary-row"><span class="k">失败原因</span><span class="v is-warn">${escapeHtml(failTip)}</span></div>`
                : ""
            }`
          )}
          ${summaryStaticSection(
            "路径",
            `<div class="summary-row"><span class="k">写 · 工作路径</span><span class="v mono summary-ellipsis" title="${escapeHtml(workdir)}">${escapeHtml(workdir)}</span></div>`
          )}
        </div>
        <div>
          ${summaryStaticSection(
            "资源规格",
            `<div class="summary-row"><span class="k">节点布局</span><span class="v">${escapeHtml(String(nodes))} 节点 · ${escapeHtml(String(gpn))} GPU/节点</span></div>
            <div class="summary-row"><span class="k">总 GPU</span><span class="v">${res.gpus} × ${escapeHtml(res.gpuType || source.gpuType || "—")}</span></div>
            <div class="summary-row"><span class="k">CPU</span><span class="v">${res.cpus} 核（${cpuPerNode} 核/节点）</span></div>
            <div class="summary-row"><span class="k">内存</span><span class="v">${formatMemGi(res.memGi)}（${memPerNode} GiB/节点）</span></div>`
          )}
          ${summaryStaticSection(
            "镜像与启动",
            `<div class="summary-row"><span class="k">镜像</span><span class="v mono summary-ellipsis" title="${escapeHtml(image)}">${escapeHtml(imageShort)}</span></div>
            ${summaryCommandBlockHtml(source.command || "")}
            ${sourceEnvBlockHtml(source.env)}
            <div class="summary-section summary-fold-nested">
              <div class="summary-section-title">配置挂载</div>
              ${sourceMountSummaryHtml(source)}
            </div>`
          )}
        </div>
      </div>
    `;
  }

  function setCreateRunUserSelection(user) {
    const hidden = $("#create-run-user");
    const search = $("#create-run-user-search");
    const chip = $("#create-run-user-selected");
    const clearBtn = $("#create-run-user-clear");
    const results = $("#create-run-user-results");
    if (!user) {
      if (hidden) hidden.value = "";
      if (search) {
        search.value = "";
        search.classList.remove("is-locked");
        search.readOnly = false;
      }
      chip?.classList.add("hidden");
      if (chip) chip.innerHTML = "";
      clearBtn?.classList.add("hidden");
      results?.classList.add("hidden");
      syncCreateRunUserHint();
      return;
    }
    if (hidden) hidden.value = user.username;
    if (search) {
      search.value = `${user.name}（${user.username}）`;
      search.readOnly = true;
      search.classList.add("is-locked");
    }
    if (chip) {
      chip.classList.remove("hidden");
      chip.innerHTML = `
        <span class="user-picker-chip">
          <span class="user-picker-chip-avatar">${escapeHtml((user.name || "?").slice(0, 1))}</span>
          <span class="user-picker-chip-meta">
            <strong>${escapeHtml(user.name)}</strong>
            <span class="mono text-muted">${escapeHtml(user.username)}</span>
            <span class="text-muted">${escapeHtml(user.department || user.title || "")}</span>
          </span>
        </span>`;
    }
    clearBtn?.classList.remove("hidden");
    results?.classList.add("hidden");
    syncCreateRunUserHint();
  }

  function renderCreateRunUserResults(q) {
    const box = $("#create-run-user-results");
    if (!box) return;
    if ($("#create-run-user-search")?.readOnly) {
      box.classList.add("hidden");
      return;
    }
    const ql = (q || "").trim().toLowerCase();
    let list = runUserCandidates();
    if (ql) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(ql) ||
          (u.username || "").toLowerCase().includes(ql) ||
          (u.email || "").toLowerCase().includes(ql) ||
          (u.department || "").toLowerCase().includes(ql)
      );
    }
    list = list.slice(0, 30);
    if (!list.length) {
      box.innerHTML = `<div class="user-picker-empty">${ql ? "无匹配的启用 LDAP 用户" : "暂无可用的平台 LDAP 用户"}</div>`;
      box.classList.remove("hidden");
      return;
    }
    box.innerHTML = list
      .map(
        (u) => `
      <button type="button" class="user-picker-item" data-run-user="${escapeHtml(u.username)}" role="option">
        <span class="user-picker-item-avatar">${escapeHtml((u.name || "?").slice(0, 1))}</span>
        <span class="user-picker-item-body">
          <span class="user-picker-item-line">
            <strong>${escapeHtml(u.name)}</strong>
            <span class="mono text-muted">${escapeHtml(u.username)}</span>
          </span>
          <span class="user-picker-item-sub text-muted">${escapeHtml(u.email || "")} · ${escapeHtml(u.department || "—")}</span>
        </span>
      </button>`
      )
      .join("");
    box.classList.remove("hidden");
    $$("[data-run-user]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = findRunUserCandidate(btn.dataset.runUser);
        if (u) applyCreateRunUser(u);
      });
    });
  }

  function applyCreateRunUser(user) {
    setCreateRunUserSelection(user);
    syncDefaultWorkdir();
    syncCreateWorkdirHelp();
    syncPlatformGeneratedMountPaths();
    renderCreateConfigMounts();
    updateCreateSummary();
  }

  function syncCreateRunUserHint() {
    const hint = $("#create-run-user-hint");
    if (!hint) return;
    const user = selectedCreateRunUser();
    const teamId = $("#create-team")?.value;
    const team = findTeam(teamId);
    const notMember =
      user && team && !(user.teamIds || []).includes(team.id) && !(team.members || []).includes(user.name);
    const lines = [
      "本地 admin 不在 LDAP。须指定一名平台 LDAP 用户作为运行身份，工作路径默认 /data/hpc/home/<账号>。",
    ];
    if (notMember) {
      lines.push(`所选用户不属于团队「${team.name}」；代提后任务仍记在该用户名下。`);
    }
    hint.textContent = lines.join(" ");
  }

  function syncCreateRunUserField() {
    const group = $("#create-run-user-group");
    const admin = isPlatformAdmin();
    group?.classList.toggle("hidden", !admin);
    if (!admin) {
      setCreateRunUserSelection(null);
      $("#create-run-user-results")?.classList.add("hidden");
    }
  }

  function renderJobCreate() {
    const isRerun = Boolean(rerunFromJobId);
    const source = isRerun ? findJob(rerunFromJobId) : null;

    $("#create-page-title").textContent = isRerun ? "重跑训练任务" : "创建训练任务";
    $("#create-page-desc").textContent = isRerun
      ? "已载入原任务配置，按需修改团队 / 队列与参数后重新提交（IB 由所选队列决定）"
      : "选择团队与资源队列，按队列额度配置规格与启动参数后提交（IB 能力由所选队列决定）";
    $("#btn-submit-job").textContent = isRerun ? "确认重跑" : "提交训练任务";

    const banner = $("#rerun-banner");
    const sourceTab = $("#create-tab-source");
    const sourcePanel = $("#rerun-source-section");
    const showSource = Boolean(isRerun && source);
    sourceTab?.classList.toggle("hidden", !showSource);
    sourcePanel?.classList.toggle("hidden", !showSource);
    if (showSource) {
      banner.classList.remove("hidden");
      $("#rerun-banner-text").innerHTML = `基于任务 <strong class="mono">${escapeHtml(source.id)}</strong>（${escapeHtml(source.name)}）创建，表单已回填源任务配置，提交将创建新的任务`;
      renderRerunSourceInfo(source);
    } else {
      banner.classList.add("hidden");
      if (createFormTab === "source") createFormTab = "basic";
    }

    const preferTeam = isRerun && source ? source.teamId : CREATE_DEFAULTS.teamId;
    const preferQueue = isRerun && source ? source.queueId : CREATE_DEFAULTS.queueId;
    populateCreateTeamOptions(preferTeam);
    const teamIdSel = $("#create-team")?.value || preferTeam;
    populateCreateQueueOptions(teamIdSel, preferQueue);

    syncCreateRunUserField();
    if (isPlatformAdmin()) {
      setCreateRunUserSelection(isRerun && source ? runUserFromJob(source) : null);
    }

    if (isRerun && source) {
      const gpn = gpusPerNodeOf(source);
      const rerunName = `${source.name}-rerun`;
      const srcNodes = source.nodes || 1;
      const srcRes = jobResourcesOf(source);
      const workdir = defaultWorkdir();
      fillCreateForm({
        name: rerunName,
        teamId: source.teamId || preferTeam,
        queueId: source.queueId || preferQueue,
        priority: source.priority || "P2",
        nodes: String(srcNodes),
        gpusPerNode: String(gpn),
        gpuType: source.gpuType || "H100-80G",
        cpuPerNode: String(Math.max(1, Math.round(srcRes.cpus / srcNodes))),
        memGiPerNode: String(Math.max(1, Math.round(srcRes.memGi / srcNodes))),
        image: source.image,
        command: source.command || "",
        env: envToText(source.env) || CREATE_DEFAULTS.env,
        workdir,
      });
      lastCreateWorkdirDefault = workdir;
      createCpuMemManual = true;
      syncCreateFromQueue();
      syncCreateCpuMemManualFlag();
    } else {
      createCpuMemManual = false;
      const workdir = defaultWorkdir();
      fillCreateForm({
        ...CREATE_DEFAULTS,
        workdir,
      });
      lastCreateWorkdirDefault = workdir;
      populateCreateTeamOptions(CREATE_DEFAULTS.teamId);
      populateCreateQueueOptions(CREATE_DEFAULTS.teamId, CREATE_DEFAULTS.queueId);
      syncCreateFromQueue();
    }

    syncCreatePriorityUi();

    const onTeamChange = () => {
      populateCreateQueueOptions($("#create-team")?.value);
      syncCreateFromQueue();
      const teamId = $("#create-team")?.value;
      const allowed = new Set(mountsVisibleForTeam(teamId).map((s) => s.id));
      const before = createConfigMounts.length;
      createConfigMounts.forEach((m) => {
        if (m.setId && !allowed.has(m.setId)) m.setId = "";
      });
      if (createConfigMounts.some((m) => !m.setId) && before) {
        toast("团队已切换，部分配置集不可见，已清空对应挂载", "warning");
      }
      renderCreateConfigMounts();
      syncCreateRunUserHint();
      updateCreateSummary();
    };
    const onQueueChange = () => {
      syncCreateFromQueue();
      updateCreateSummary();
    };

    if ($("#create-team")) $("#create-team").onchange = onTeamChange;
    if ($("#create-queue")) $("#create-queue").onchange = onQueueChange;
    $$('input[name="create-priority"]').forEach((r) => {
      r.onchange = () => {
        syncCreatePriorityUi();
        updateCreateSummary();
      };
    });
    bindGpusPerNodeInput();
    bindCreateCpuMemInputs();

    [
      "create-name",
      "create-nodes",
      "create-gpus-per-node",
      "create-gpu-type",
      "create-image",
      "create-command",
      "create-env",
      "create-workdir",
    ].forEach((id) => {
      const el = $(`#${id}`);
      if (!el) return;
      el.oninput = () => {
        if (id === "create-name") {
          syncPlatformGeneratedMountPaths();
          renderCreateConfigMounts();
        }
        if (id === "create-command") updateCreateConfigHint();
        if (id === "create-nodes" || id === "create-gpus-per-node" || id === "create-gpu-type") {
          applyCreateCpuMemDefaults();
        }
        updateCreateSummary();
      };
      el.onchange = () => {
        if (id === "create-nodes" || id === "create-gpus-per-node" || id === "create-gpu-type") {
          applyCreateCpuMemDefaults();
        }
        if (id === "create-workdir") {
          if (!el.value.trim()) syncDefaultWorkdir();
        }
        updateCreateSummary();
      };
    });

    if (isRerun && source) {
      createConfigMounts = mountsFromJob(source);
    } else if (pendingConfigMount) {
      createConfigMounts = [newCreateMount(pendingConfigMount)];
    } else {
      createConfigMounts = defaultCreateMounts();
    }
    pendingConfigMount = null;

    const addBtn = $("#btn-add-config-mount");
    if (addBtn) addBtn.onclick = addCreateConfigMount;
    syncPlatformGeneratedMountPaths();
    renderCreateConfigMounts();
    syncCreateConfigAddButton();
    bindCodeEditor($("#create-command"), $("#create-command-hl"), "shell");
    bindCodeEditor($("#create-env"), $("#create-env-hl"), "env");
    refreshCreatePathChecks();
    syncCreateWorkdirHelp();
    syncCreateRunUserHint();
    switchCreateFormTab(createFormTab || "basic", { scroll: false });
    updateCreateSummary();
  }

  function summaryCommandBodyHtml(text, highlight) {
    return String(text || "")
      .split(/(\s+)/)
      .map((part) => {
        if (!part) return "";
        if (/^\s+$/.test(part)) return escapeHtml(part);
        const inner = highlight ? highlightSource(part, "shell") : escapeHtml(part);
        return `<span class="summary-cmd-tok">${inner}</span>`;
      })
      .join("");
  }

  function summaryStaticSection(title, bodyHtml) {
    return `<div class="summary-section">
      <div class="summary-section-title">${title}</div>
      ${bodyHtml}
    </div>`;
  }

  function summaryCommandBlockHtml(command) {
    const text = String(command || "").trim();
    if (!text) {
      return `<div class="summary-cmd-k">启动命令</div><div class="summary-cmd-empty">尚未填写</div>`;
    }
    return `<div class="summary-cmd-k">启动命令</div>
      <pre class="summary-cmd-body">${summaryCommandBodyHtml(text, true)}</pre>`;
  }

  function updateCreateSummary() {
    syncCreateCpuMemResetUi();
    syncCreateTabMeta();
  }

  function submitJob(e) {
    e?.preventDefault();
    const name = $("#create-name")?.value?.trim();
    const nodes = +($("#create-nodes")?.value || 0);
    const gpusPerNode = +($("#create-gpus-per-node")?.value || 0);
    const command = $("#create-command")?.value?.trim();
    const image = readCreateImage();
    const teamId = $("#create-team")?.value;
    const queueId = $("#create-queue")?.value;
    const team = findTeam(teamId);
    const q = findQueue(queueId);

    if (!name) {
      toast("请填写任务名称", "error");
      switchCreateFormTab("basic");
      return;
    }
    if (isPlatformAdmin() && !selectedCreateRunUser()) {
      toast("请检索并指定运行用户。本地 admin 不在 LDAP 中，不能作为运行身份。", "error");
      switchCreateFormTab("basic");
      $("#create-run-user-search")?.focus();
      return;
    }
    const workdirValue = ($("#create-workdir")?.value || "").trim();
    if (!team) {
      toast("请选择所属团队", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (!q) {
      toast("请选择资源队列", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (!nodes || nodes < 1) {
      toast("请填写有效的节点数", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (!gpusPerNode || gpusPerNode < 1) {
      toast("请填写有效的每节点 GPU 数", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (gpusPerNode > GPUS_PER_NODE_MAX) {
      toast(`每节点 GPU 数不能超过 ${GPUS_PER_NODE_MAX}`, "error");
      const gpnInput = $("#create-gpus-per-node");
      if (gpnInput) gpnInput.value = String(GPUS_PER_NODE_MAX);
      switchCreateFormTab("resources");
      return;
    }
    const cpuPerNode = readCreateCpuPerNode();
    const memGiPerNode = readCreateMemPerNode();
    if (!cpuPerNode) {
      toast("请填写有效的每节点 CPU 核数", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (!memGiPerNode) {
      toast("请填写有效的每节点内存", "error");
      switchCreateFormTab("resources");
      return;
    }
    if (!image) {
      toast("请填写容器镜像地址", "error");
      switchCreateFormTab("launch");
      return;
    }
    if (!isCreateImageRef(image)) {
      toast("请填写完整镜像地址，例如 harbor.msxf.com/ai/megatron:24.07-cuda12.4", "error");
      switchCreateFormTab("launch");
      return;
    }
    if (!command) {
      toast("请填写启动命令", "error");
      switchCreateFormTab("launch");
      return;
    }
    const pathIssues = collectCreatePathIssues();
    if (pathIssues.length) {
      toast(pathIssues[0].message, "error");
      const msg = pathIssues[0].message || "";
      if (msg.includes("启动命令")) switchCreateFormTab("launch");
      else if (msg.includes("配置")) switchCreateFormTab("configs");
      else switchCreateFormTab("basic");
      refreshCreatePathChecks();
      updateCreateSummary();
      return;
    }
    const mountConflicts = createMountConflictMap();
    if (createConfigMounts.some((m) => m.setId && mountConflicts[m.uid])) {
      toast("配置挂载路径冲突（CONFIG_MOUNT_CONFLICT）", "error");
      switchCreateFormTab("configs");
      return;
    }
    if (createConfigMounts.some((m) => !m.setId)) {
      toast("请选择配置集，或删除空的挂载卡片", "error");
      switchCreateFormTab("configs");
      return;
    }

    const totalGpus = nodes * gpusPerNode;
    const totalCpus = nodes * cpuPerNode;
    const totalMemGi = nodes * memGiPerNode;
    const free = queueGpuFree(q);
    const freeCpu = queueCpuFree(q);
    const freeMem = queueMemFree(q);
    // 允许申请量超过队列当前剩余额度：提交成功后进入排队，等待资源释放再调度
    const willQueueForResource = totalGpus > free || totalCpus > freeCpu || totalMemGi > freeMem;

    // 与队列管理特性一致：IB 完全由队列决定
    const requireIB = queueSupportsIB(q);
    const priority = getCreatePriority();
    const pDef = jobPriorityDef(priority);
    const isRerun = Boolean(rerunFromJobId);
    const source = isRerun ? findJob(rerunFromJobId) : null;
    const id = `job-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const netLabel = requireIB ? "IB" : "无 IB";
    const prioLabel = `${priority}/${pDef.label}`;
    const queueNote = willQueueForResource
      ? `；申请 ${totalGpus} 卡 > 剩余 ${free} 卡，资源不足将排队等待（优先级 ${prioLabel}）`
      : "";
    const derived = jobResourcesFromSpec(totalGpus, q.gpuType || "H100-80G", {
      ...(source || {}),
      cpus: totalCpus,
      memGi: totalMemGi,
      nodes,
    });
    const runUser = resolveCreateRunUser() || currentLoginAsRunUser();
    if (isPlatformAdmin() && isLocalAdminUsername(runUser.username)) {
      toast("请检索并指定运行用户。本地 admin 不在 LDAP 中，不能作为运行身份。", "error");
      switchCreateFormTab("basic");
      $("#create-run-user-search")?.focus();
      return;
    }
    const submittedByAdmin =
      isPlatformAdmin() && runUser.username && runUser.username !== MOCK.user.username;
    const actorPrefix = submittedByAdmin
      ? `平台管理员以 ${runUser.name}（${runUser.username}）`
      : "";
    const queueCtx = `队列 ${q.name}（${dcName(q.dc)} · ${netLabel} · ${prioLabel}）`;
    const newJob = {
      id,
      name,
      status: "queued",
      framework: source?.framework || "—",
      owner: runUser.name,
      teamId: team.id,
      teamName: team.name,
      queue: q.name,
      queueId: q.id,
      dc: q.dc,
      requireIB,
      gpus: totalGpus,
      nodes,
      gpuType: q.gpuType || "H100-80G",
      cpus: derived.cpus,
      memGi: derived.memGi,
      image,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      startedAt: "-",
      endedAt: "-",
      duration: "-",
      progress: 0,
      currentStep: null,
      maxSteps: null,
      loss: null,
      priority,
      namespace: source?.namespace || "slm-pretrain",
      command,
      env: parseEnvText($("#create-env")?.value),
      ownerUsername: runUser.username,
      submittedBy: MOCK.user.name,
      submittedByUsername: MOCK.user.username || "",
      workdir: workdirValue || defaultWorkdir(runUser.username),
      pods: [],
      events: [
        {
          time: new Date().toTimeString().slice(0, 8),
          event: isRerun
            ? actorPrefix
              ? `${actorPrefix}重跑任务 ${rerunFromJobId}，提交至${queueCtx}${queueNote}`
              : `由任务 ${rerunFromJobId} 重跑提交至${queueCtx}${queueNote}`
            : actorPrefix
              ? `${actorPrefix}提交至${queueCtx}${
                  willQueueForResource ? queueNote : "，等待调度"
                }`
              : `任务已提交至${queueCtx}${
                  willQueueForResource
                    ? `，申请 ${totalGpus} 卡超过剩余 ${free} 卡，按优先级进入排队等待资源`
                    : "，等待调度"
                }`,
        },
      ],
      rerunFrom: isRerun ? rerunFromJobId : undefined,
      pendingResource: willQueueForResource || undefined,
      configMounts: snapshotMountsForSubmit(),
    };
    // 演示：占用队列额度（可超过当前剩余，体现排队占位）
    q.gpuUsed = (q.gpuUsed || 0) + totalGpus;
    q.cpuUsed = (q.cpuUsed || 0) + totalCpus;
    q.memUsedGi = (q.memUsedGi || 0) + totalMemGi;
    if (willQueueForResource) {
      q.pending = (q.pending || 0) + 1;
    }
    MOCK.jobs.unshift(newJob);
    toast(
      willQueueForResource
        ? `${isRerun ? "重跑" : ""}任务已提交，资源不足将排队（申请 ${totalGpus} / 剩余 ${free} 卡）`
        : isRerun
          ? `重跑任务已提交: ${name}`
          : `任务已提交: ${name}`,
      willQueueForResource ? "warning" : undefined
    );
    currentJobId = id;
    rerunFromJobId = null;
    setTimeout(() => navigate("job-detail"), 400);
  }

  /* ---------- Job Detail ---------- */
  function renderJobDetail() {
    const job = findJob(currentJobId);
    $("#job-detail-hero").innerHTML = `
      <div class="detail-hero-top">
        <div>
          <h2>${escapeHtml(job.name)} ${badge(job.status)}</h2>
          <div class="mono text-muted mt-8" style="font-size:12px">${escapeHtml(job.id)}</div>
          ${
            job.failReason
              ? `<div class="detail-fail-banner">
                   <strong>失败原因</strong>
                   <span>${escapeHtml(job.failReason)}</span>
                 </div>`
              : ""
          }
        </div>
        <div class="page-actions">
          ${
            job.status === "running" || job.status === "queued" || job.status === "starting"
              ? `<button class="btn btn-danger btn-sm" id="btn-stop-job">停止任务</button>`
              : `<button class="btn btn-primary btn-sm" id="btn-clone-job">重跑</button>`
          }
        </div>
      </div>
      <div class="detail-meta">
        <div class="meta-item"><div class="label">创建人</div><div class="value">${escapeHtml(job.owner || "—")}${
          job.ownerUsername
            ? ` <span class="mono text-muted">${escapeHtml(job.ownerUsername)}</span>`
            : ""
        }</div></div>
        ${
          job.submittedByUsername && job.submittedByUsername !== job.ownerUsername
            ? `<div class="meta-item"><div class="label">提交人</div><div class="value">${escapeHtml(
                job.submittedBy || job.submittedByUsername
              )}</div></div>`
            : ""
        }
        <div class="meta-item"><div class="label">优先级</div><div class="value">${renderJobPriorityBadge(job.priority)}</div></div>
        <div class="meta-item"><div class="label">创建时间</div><div class="value mono">${escapeHtml(jobTimeText(job.createdAt))}</div></div>
        <div class="meta-item"><div class="label">启动时间</div><div class="value mono">${escapeHtml(jobTimeText(job.startedAt))}</div></div>
        <div class="meta-item"><div class="label">结束时间</div><div class="value mono">${escapeHtml(jobEndedAtText(job))}</div></div>
        <div class="meta-item"><div class="label">运行时长</div><div class="value mono">${escapeHtml(jobTimeText(job.duration))}</div></div>
      </div>
    `;

    $("#btn-stop-job")?.addEventListener("click", () => openStopJobConfirm(job.id));
    $("#btn-clone-job")?.addEventListener("click", () => goRerunJob(job.id));
    bindJobLinks();

    // 关联告警数量（Tab 标题）
    const jobAlertCount = MOCK.alerts.filter((a) => alertJobIds(a).includes(job.id)).length;
    const countEl = $("#job-alert-tab-count");
    if (countEl) {
      countEl.textContent = String(jobAlertCount);
      countEl.classList.toggle("is-zero", jobAlertCount === 0);
      countEl.hidden = false;
    }

    // tabs：配置信息在最左为默认；日志检索在最右
    selectedPodName = job.pods?.[0]?.name || `${job.name}-master-0`;
    initTabs("#job-detail-tabs", "#job-detail-panels", (tab) => {
      if (tab === "config") renderConfigTab(job);
      if (tab === "pods") renderPodsLogsSplit(job);
      if (tab === "metrics") renderMetricsTab(job);
      if (tab === "alerts") renderJobAlertsTab(job);
      if (tab === "logsearch") renderLogSearchTab(job);
      // 同步 hash，便于直达任务监控等 Tab
      location.hash = `job-detail/${job.id}/${tab}`;
    });

    // 默认配置信息；支持 hash …/metrics 直达监控
    const hashParts = location.hash.replace(/^#/, "").split("/");
    const deepTab = hashParts[2]; // job-detail/:id/:tab
    if (deepTab && ["config", "pods", "metrics", "alerts", "logsearch"].includes(deepTab)) {
      // 先渲染默认再切换，保证 initTabs 已绑定
      renderConfigTab(job);
      setTimeout(() => activateJobDetailTab(deepTab), 0);
    } else {
      renderConfigTab(job);
    }
  }

  function initTabs(tabsSel, panelsSel, onChange) {
    const tabs = $$(`${tabsSel} .tab`);
    const panels = $$(`${panelsSel} .tab-panel`);
    tabs.forEach((tab) => {
      tab.onclick = () => {
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = $(`${panelsSel} [data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add("active");
        onChange?.(tab.dataset.tab);
      };
    });
    // activate first
    if (tabs[0] && !tabs.some((t) => t.classList.contains("active"))) {
      tabs[0].classList.add("active");
      const p = $(`${panelsSel} [data-panel="${tabs[0].dataset.tab}"]`);
      p?.classList.add("active");
    }
  }

  /** Pod 列表（左）+ 选中 Pod 日志（右），无日志级别筛选 */
  function renderPodsLogsSplit(job) {
    const el = $("#panel-pods");
    const pods = job.pods?.length
      ? job.pods
      : [{ name: `${job.name}-master-0`, role: "Master", node: "—", status: "Unknown", restarts: 0, gpu: "—" }];

    if (!selectedPodName || !pods.some((p) => p.name === selectedPodName)) {
      selectedPodName = pods[0].name;
    }
    const selected = pods.find((p) => p.name === selectedPodName) || pods[0];
    const running = pods.filter((p) => p.status === "Running").length;

    el.innerHTML = `
      <div class="pod-log-split">
        <div class="pod-log-pane pod-log-pane-left">
          <div class="pod-log-pane-head">
            <div>
              <div class="pod-log-pane-title">Pod 列表</div>
              <div class="text-muted" style="font-size:11.5px;margin-top:2px">
                共 ${pods.length} · Running ${running} · 节点 ${new Set(pods.map((p) => p.node)).size}
              </div>
            </div>
          </div>
          <div class="pod-log-list" id="pod-list-scroll">
            ${pods
              .map(
                (p, idx) => `
              <div class="pod-row ${p.name === selectedPodName ? "selected" : ""}" data-select-pod="${p.name}" title="${p.name}">
                <div class="pod-row-top">
                  <span class="pod-row-idx mono">${idx}</span>
                  <span class="pod-row-name mono">${p.name.replace(job.name + "-", "")}</span>
                  <span class="badge ${p.status === "Running" ? "badge-running" : p.status === "Failed" ? "badge-failed" : "badge-starting"}">${p.status}</span>
                </div>
                <div class="pod-row-meta">
                  <span class="tag">${p.role}</span>
                  <span class="tag mono">rank ${p.rank ?? idx}</span>
                  <span class="mono text-muted">${p.node}</span>
                  <span class="mono text-muted">${p.gpu || "—"}</span>
                  <span class="text-muted">重启 ${p.restarts ?? 0}</span>
                </div>
              </div>`
              )
              .join("")}
          </div>
        </div>
        <div class="pod-log-pane pod-log-pane-right">
          <div class="pod-log-pane-head">
            <div style="min-width:0;flex:1">
              <div class="pod-log-pane-title">进程日志</div>
              <div class="mono text-muted" style="font-size:11.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="selected-pod-label">
                ${selected.name} · ${selected.role} · rank ${selected.rank ?? 0} · ${selected.node}
              </div>
            </div>
            <div class="flex gap-8" style="flex-shrink:0">
              <label class="flex-center gap-8 text-muted" style="font-size:12px">
                <input type="checkbox" id="log-follow" checked /> 跟随
              </label>
              <button class="btn btn-secondary btn-sm" id="btn-refresh-log">刷新</button>
              <button class="btn btn-ghost btn-sm" id="btn-download-log">下载</button>
            </div>
          </div>
          <div class="log-panel pod-log-panel">
            <div class="log-lines" id="log-lines"></div>
          </div>
        </div>
      </div>`;

    $$("[data-select-pod]").forEach((row) => {
      row.addEventListener("click", () => {
        selectedPodName = row.dataset.selectPod;
        // 更新选中样式
        $$(".pod-row").forEach((r) => r.classList.toggle("selected", r.dataset.selectPod === selectedPodName));
        const pod = pods.find((p) => p.name === selectedPodName);
        const label = $("#selected-pod-label");
        if (label && pod) {
          label.textContent = `${pod.name} · ${pod.role} · rank ${pod.rank ?? 0} · ${pod.node}`;
        }
        renderLogLines(job);
      });
    });

    $("#btn-refresh-log")?.addEventListener("click", () => {
      renderLogLines(job);
      toast("日志已刷新");
    });
    $("#btn-download-log")?.addEventListener("click", () => toast("日志下载已开始（演示）"));

    renderLogLines(job);
  }

  function jobPodsOf(job) {
    if (job?.pods?.length) return job.pods;
    return [{ name: `${job?.name || "job"}-master-0`, role: "Master", rank: 0, node: "—", status: "Unknown", restarts: 0, gpu: "—" }];
  }

  function podShortName(job, podName) {
    const prefix = `${job?.name || ""}-`;
    const name = String(podName || "");
    return name.startsWith(prefix) ? name.slice(prefix.length) : name;
  }

  function podRankOf(job, podName) {
    const pods = jobPodsOf(job);
    const p = pods.find((x) => x.name === podName);
    if (p && Number.isFinite(Number(p.rank))) return Number(p.rank);
    const idx = pods.findIndex((x) => x.name === podName);
    return idx < 0 ? 0 : idx;
  }

  function podRoleOf(job, podName) {
    const p = jobPodsOf(job).find((x) => x.name === podName);
    if (p?.role) return p.role;
    return /master/i.test(podName || "") ? "Master" : "Worker";
  }

  function logsForPod(job, podName, { compact = false } = {}) {
    const podKey = podName || "";
    let lines = MOCK.podsLogs[podKey] || MOCK.podsLogs["slm-7b-pretrain-phase3-master-0"];
    if (!lines) {
      lines = [
        { ts: "00:00:01", level: "info", msg: "container started" },
        { ts: "00:00:05", level: "info", msg: `job ${job.id} pod ${podKey} bootstrap` },
      ];
    }
    const rank = podRankOf(job, podKey);
    const role = podRoleOf(job, podKey);
    const isMaster = /master/i.test(role);
    let display = isMaster
      ? lines
      : lines.map((l, i) => ({
          ...l,
          msg:
            i === 0
              ? `[Worker] pod=${podKey} | ${l.msg}`
              : l.msg.replace("[Megatron]", "[Megatron:worker]"),
        }));
    if (compact && display.length > 6) display = display.slice(0, 6);
    return display.map((l) => ({
      ...l,
      pod: podKey,
      rank: l.rank != null ? l.rank : rank,
      role,
      process: `rank${l.rank != null ? l.rank : rank}`,
    }));
  }

  function collectJobLogs(job, podFilter) {
    const pods = jobPodsOf(job);
    const targets =
      podFilter && podFilter !== "all" ? pods.filter((p) => p.name === podFilter) : pods;
    const compactAll = (!podFilter || podFilter === "all") && targets.length > 1;
    const hits = [];
    targets.forEach((p) => {
      hits.push(
        ...logsForPod(job, p.name, {
          compact: compactAll && !MOCK.podsLogs[p.name],
        })
      );
    });
    return hits;
  }

  function renderLogLines(job) {
    const display = logsForPod(job, selectedPodName || "");
    const box = $("#log-lines");
    if (!box) return;
    if (!display.length) {
      box.innerHTML = `<div class="empty-state" style="padding:24px 8px">没有匹配的进程日志</div>`;
      return;
    }
    box.innerHTML = display
      .map((l) => {
        const msg = escapeHtml(l.msg);
        return `
      <div class="log-line">
        <span class="log-ts">${l.ts}</span>
        <span class="log-rank mono">r${l.rank ?? 0}</span>
        <span class="log-level ${l.level}">${l.level.toUpperCase()}</span>
        <span class="log-msg">${msg}</span>
      </div>`;
      })
      .join("");

    if ($("#log-follow")?.checked) {
      box.scrollTop = box.scrollHeight;
    }
  }

  function renderLogSearchTab(job) {
    const el = $("#panel-logsearch");
    const pods = jobPodsOf(job);
    if (logSearchPod !== "all" && !pods.some((p) => p.name === logSearchPod)) {
      logSearchPod = "all";
    }
    const podOptions = [
      `<option value="all"${logSearchPod === "all" ? " selected" : ""}>全部</option>`,
      ...pods.map(
        (p) =>
          `<option value="${escapeHtml(p.name)}"${logSearchPod === p.name ? " selected" : ""}>${escapeHtml(
            podShortName(job, p.name)
          )}</option>`
      ),
    ].join("");
    el.innerHTML = `
      <div class="toolbar logsearch-toolbar">
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input id="logsearch-input" placeholder="搜索关键词，如 NCCL / loss / checkpoint / Error ..." value="${escapeHtml(
            logKeyword
          )}" />
        </div>
        <select class="filter-select" id="logsearch-pod" aria-label="Pod">
          ${podOptions}
        </select>
        <select class="filter-select" id="logsearch-range" aria-label="时间范围">
          <option value="1h"${logSearchRange === "1h" ? " selected" : ""}>近 1 小时</option>
          <option value="6h"${logSearchRange === "6h" ? " selected" : ""}>近 6 小时</option>
          <option value="24h"${logSearchRange === "24h" ? " selected" : ""}>近 24 小时</option>
          <option value="all"${logSearchRange === "all" ? " selected" : ""}>全量日志</option>
        </select>
        <select class="filter-select" id="logsearch-sort" aria-label="时间排序">
          <option value="asc"${logSearchSort !== "desc" ? " selected" : ""}>时间正序</option>
          <option value="desc"${logSearchSort === "desc" ? " selected" : ""}>时间倒序</option>
        </select>
        <button class="btn btn-primary" id="btn-logsearch">搜索</button>
      </div>
      <div id="logsearch-results"></div>`;

    const RANGE_LABEL = { "1h": "近 1 小时", "6h": "近 6 小时", "24h": "近 24 小时", all: "全量日志" };

    const doSearch = () => {
      logKeyword = $("#logsearch-input")?.value || "";
      logSearchPod = $("#logsearch-pod")?.value || "all";
      logSearchRange = $("#logsearch-range")?.value || "6h";
      logSearchSort = $("#logsearch-sort")?.value === "desc" ? "desc" : "asc";
      const kw = logKeyword.toLowerCase();
      let hits = collectJobLogs(job, logSearchPod);
      if (kw) {
        hits = hits.filter((l) => l.msg.toLowerCase().includes(kw));
        if (kw.includes("nccl") || kw.includes("error") || kw.includes("ib")) {
          const injectPod =
            logSearchPod !== "all"
              ? logSearchPod
              : pods.find((p) => /worker/i.test(p.name))?.name || pods[0]?.name || "";
          hits = [
            ...hits,
            { ts: "11:02:18", level: "info", msg: "[NCCL] bootstrap complete, comm id=0x7f3a", pod: injectPod },
            { ts: "12:15:44", level: "warn", msg: "[NCCL] slow peer detected rank=12 latency=120ms", pod: injectPod },
          ];
        }
      }
      hits = hits.slice().sort((a, b) => {
        const c = String(a.ts || "").localeCompare(String(b.ts || ""));
        if (c !== 0) return logSearchSort === "desc" ? -c : c;
        return String(a.pod || "").localeCompare(String(b.pod || ""));
      });
      if (!hits.length) {
        $("#logsearch-results").innerHTML = `<div class="empty-state">未找到匹配日志</div>`;
        return;
      }
      const re = kw ? new RegExp(`(${escapeReg(kw)})`, "ig") : null;
      const showPod = logSearchPod === "all";
      const podLabel = logSearchPod === "all" ? "全部" : podShortName(job, logSearchPod);
      const sortLabel = logSearchSort === "desc" ? "时间倒序" : "时间正序";
      $("#logsearch-results").innerHTML = `
        <div class="text-muted mb-12" style="font-size:12px">共 ${hits.length} 条匹配 · 任务 ${escapeHtml(
          job.id
        )} · Pod ${escapeHtml(podLabel)} · ${RANGE_LABEL[logSearchRange] || "近 6 小时"} · ${sortLabel}</div>
        <div class="log-panel">
          <div class="log-lines">
            ${hits
              .map((l) => {
                let msg = escapeHtml(l.msg);
                if (re) msg = msg.replace(re, '<span class="hl">$1</span>');
                const podCell = showPod
                  ? `<span class="log-pod mono" title="${escapeHtml(l.pod || "")}">${escapeHtml(
                      podShortName(job, l.pod)
                    )}</span>`
                  : "";
                return `<div class="log-line">
                  <span class="log-ts">${l.ts}</span>
                  ${podCell}
                  <span class="log-level ${l.level}">${l.level.toUpperCase()}</span>
                  <span class="log-msg">${msg}</span>
                </div>`;
              })
              .join("")}
          </div>
        </div>`;
    };

    $("#btn-logsearch")?.addEventListener("click", doSearch);
    $("#logsearch-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    $("#logsearch-pod")?.addEventListener("change", doSearch);
    $("#logsearch-range")?.addEventListener("change", doSearch);
    $("#logsearch-sort")?.addEventListener("change", doSearch);
    doSearch();
  }

  /** 多序列折线图（任务监控看板，含悬停十字竖线） */
  function multiLineChart(opts) {
    const series = opts.series || [];
    if (!series.length || !series[0].values?.length) {
      return `<div class="empty-state" style="padding:24px">无数据</div>`;
    }
    const n = series[0].values.length;
    const w = opts.w || 480;
    const h = opts.h || 220;
    const unit = opts.unit || "";
    const yMin = opts.yMin != null ? opts.yMin : 0;
    const yMax = opts.yMax != null ? opts.yMax : 100;
    const pad = { l: 44, r: opts.rightAxis ? 48 : 14, t: 16, b: 32 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const xTo = (i) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yTo = (v, min, max) => pad.t + plotH - ((v - min) / (max - min || 1)) * plotH;
    const id = `mch${++_chartSeq}`;

    let grid = "";
    for (let t = 0; t <= 4; t++) {
      const v = yMin + ((yMax - yMin) * t) / 4;
      const y = yTo(v, yMin, yMax);
      const num =
        yMax - yMin <= 5
          ? v.toFixed(2)
          : yMax - yMin <= 50
          ? v.toFixed(1)
          : String(Math.round(v));
      grid += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + plotW}" y2="${y}" class="ichart-grid"/>
        <text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" class="ichart-axis-label">${num}${t === 4 || t === 0 ? unit : ""}</text>`;
    }

    const xIdx =
      opts.xLabels && typeof opts.xLabels === "object"
        ? Object.keys(opts.xLabels).map(Number).sort((a, b) => a - b)
        : [0, Math.floor(n / 2), n - 1];
    let xAxis = xIdx
      .map((i) => {
        const label =
          opts.xLabels && opts.xLabels[i] != null ? opts.xLabels[i] : `${i}`;
        return `<text x="${xTo(i)}" y="${h - 8}" text-anchor="middle" class="ichart-axis-label">${label}</text>`;
      })
      .join("");

    // 全量 x 轴标签（tooltip 用）
    const tipLabels = [];
    for (let i = 0; i < n; i++) {
      if (opts.xLabels && opts.xLabels[i] != null) tipLabels.push(String(opts.xLabels[i]));
      else if (opts.xLabelFn) tipLabels.push(opts.xLabelFn(i, n));
      else tipLabels.push(String(i));
    }
    // 插值缺失的中间标签（用邻近已标注值）
    if (opts.xLabels) {
      const keys = Object.keys(opts.xLabels).map(Number).sort((a, b) => a - b);
      for (let i = 0; i < n; i++) {
        if (opts.xLabels[i] != null) continue;
        // 线性比例时间/step
        const frac = n === 1 ? 0 : i / (n - 1);
        if (keys.length >= 2) {
          const a = keys[0];
          const b = keys[keys.length - 1];
          const la = opts.xLabels[a];
          const lb = opts.xLabels[b];
          // 若是 step 数字
          if (!Number.isNaN(+la) && !Number.isNaN(+lb)) {
            tipLabels[i] = String(Math.round(+la + (+lb - +la) * frac));
          } else {
            tipLabels[i] = `#${i}`;
          }
        } else {
          tipLabels[i] = `#${i}`;
        }
      }
    }

    let paths = "";
    let dots = "";
    series.forEach((s, si) => {
      const min = s.yMin != null ? s.yMin : yMin;
      const max = s.yMax != null ? s.yMax : yMax;
      const pts = s.values.map((v, i) => `${xTo(i).toFixed(1)},${yTo(v, min, max).toFixed(1)}`).join(" ");
      const dash = s.dashed ? `stroke-dasharray="4 3"` : "";
      paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" ${dash} class="mon-series-line"/>`;
      if (s.fill) {
        const area = `${xTo(0)},${pad.t + plotH} ${pts} ${xTo(n - 1)},${pad.t + plotH}`;
        paths += `<polygon points="${area}" fill="${s.color}" opacity="0.12"/>`;
      }
      dots += `<circle class="mon-hover-dot" data-si="${si}" r="3.5" fill="${s.color}" stroke="var(--chart-dot-stroke)" stroke-width="1.5" visibility="hidden"/>`;
    });

    let rightAxis = "";
    if (opts.rightAxis) {
      const { min, max, unit: ru } = opts.rightAxis;
      for (let t = 0; t <= 4; t++) {
        const v = min + ((max - min) * t) / 4;
        const y = yTo(v, min, max);
        const label = max < 0.01 ? v.toFixed(4) : max < 1 ? v.toFixed(3) : v.toFixed(1);
        rightAxis += `<text x="${w - 6}" y="${y + 3}" text-anchor="end" class="ichart-axis-label">${t === 0 || t === 4 ? label + (ru || "") : label}</text>`;
      }
    }

    const legend = series
      .map(
        (s) =>
          `<span class="mon-legend-item"><i style="background:${s.color};${s.dashed ? "opacity:.7;height:2px;margin-top:5px" : ""}"></i>${s.name}</span>`
      )
      .join("");

    // 序列元数据（供交互绑定）
    const meta = {
      n,
      w,
      h,
      pad,
      yMin,
      yMax,
      unit,
      tipLabels,
      series: series.map((s) => ({
        name: s.name,
        color: s.color,
        values: s.values,
        yMin: s.yMin != null ? s.yMin : yMin,
        yMax: s.yMax != null ? s.yMax : yMax,
        unit: s.unit || unit,
      })),
    };

    return `
      <div class="mon-chart-wrap mon-chart-interactive" id="${id}" data-meta='${escapeHtml(JSON.stringify(meta))}'>
        <div class="mon-chart-legend">${legend}</div>
        <div class="mon-chart-plot">
          <svg class="ichart-svg mon-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
            ${grid}${xAxis}${paths}${rightAxis}
            <line class="mon-crosshair" x1="0" y1="${pad.t}" x2="0" y2="${pad.t + plotH}" visibility="hidden"/>
            ${dots}
            <rect class="mon-hit"
              x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"
              fill="transparent" style="cursor:crosshair"/>
          </svg>
          <div class="mon-chart-tooltip" hidden>
            <div class="mon-tip-x"></div>
            <div class="mon-tip-rows"></div>
          </div>
        </div>
      </div>`;
  }

  function bindMultiCharts(root = document) {
    $$(`.mon-chart-interactive`, root).forEach((wrap) => {
      if (wrap._bound) return;
      wrap._bound = true;
      let meta;
      try {
        meta = JSON.parse(wrap.dataset.meta || "{}");
      } catch {
        return;
      }
      const svg = $(".mon-chart-svg", wrap);
      const hit = $(".mon-hit", wrap);
      const cross = $(".mon-crosshair", wrap);
      const tip = $(".mon-chart-tooltip", wrap);
      const tipX = $(".mon-tip-x", tip);
      const tipRows = $(".mon-tip-rows", tip);
      const dots = $$(".mon-hover-dot", wrap);
      if (!svg || !hit || !meta.n) return;

      const { n, w, h, pad, series } = meta;
      const plotW = w - pad.l - pad.r;
      const plotH = h - pad.t - pad.b;
      const xTo = (i) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
      const yTo = (v, min, max) => pad.t + plotH - ((v - min) / (max - min || 1)) * plotH;

      function clientToSvg(clientX, clientY) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        return pt.matrixTransform(ctm.inverse());
      }

      function fmtVal(v, unit) {
        if (unit === "" && Math.abs(v) < 0.01 && v !== 0) return v.toFixed(5);
        if (Math.abs(v) >= 100) return Math.round(v).toString();
        if (Math.abs(v) >= 10) return v.toFixed(1);
        return v.toFixed(2);
      }

      function showAt(idx) {
        const x = xTo(idx);
        cross.setAttribute("x1", x);
        cross.setAttribute("x2", x);
        cross.setAttribute("visibility", "visible");

        dots.forEach((dot) => {
          const si = +dot.dataset.si;
          const s = series[si];
          if (!s) return;
          const v = s.values[idx];
          const y = yTo(v, s.yMin, s.yMax);
          dot.setAttribute("cx", x);
          dot.setAttribute("cy", y);
          dot.setAttribute("visibility", "visible");
        });

        const xLabel = (meta.tipLabels && meta.tipLabels[idx]) || `#${idx}`;
        tipX.textContent = xLabel;
        // 多序列时 tooltip 最多展示前 8 条，避免过长
        const rows = series.slice(0, 8).map((s) => {
          const v = s.values[idx];
          return `<div class="mon-tip-row">
            <span class="mon-tip-dot" style="background:${s.color}"></span>
            <span class="mon-tip-name">${escapeHtml(s.name)}</span>
            <span class="mon-tip-val">${fmtVal(v, s.unit)}${s.unit ? " " + escapeHtml(s.unit) : ""}</span>
          </div>`;
        });
        if (series.length > 8) {
          rows.push(`<div class="mon-tip-row mon-tip-more">…共 ${series.length} 条序列</div>`);
        }
        tipRows.innerHTML = rows.join("");
        tip.hidden = false;

        const plot = $(".mon-chart-plot", wrap);
        const rect = svg.getBoundingClientRect();
        const wrapRect = plot.getBoundingClientRect();
        const sx = rect.left - wrapRect.left + (x / w) * rect.width;
        const tipW = tip.offsetWidth || 120;
        let left = sx + 14;
        if (left + tipW > wrapRect.width - 4) left = sx - tipW - 14;
        tip.style.left = `${Math.max(0, left)}px`;
        tip.style.top = `12px`;
      }

      function hide() {
        cross.setAttribute("visibility", "hidden");
        dots.forEach((d) => d.setAttribute("visibility", "hidden"));
        tip.hidden = true;
      }

      hit.addEventListener("mousemove", (e) => {
        const p = clientToSvg(e.clientX, e.clientY);
        if (!p) return;
        const rel = Math.min(plotW, Math.max(0, p.x - pad.l));
        const idx =
          n === 1 ? 0 : Math.round((rel / plotW) * (n - 1));
        showAt(Math.max(0, Math.min(n - 1, idx)));
      });
      hit.addEventListener("mouseleave", hide);
    });
  }

  function utilLevel(u) {
    if (u >= 92) return "hot";
    if (u >= 80) return "warm";
    return "ok";
  }

  function renderGpuTopo(job) {
    const nodes = Math.max(1, job.nodes || 8);
    const perNode = Math.max(1, Math.round((job.gpus || 64) / nodes) || 8);
    const total = Math.min(nodes * perNode, job.gpus || 64);
    // 展示用：最多 64 卡网格
    const show = Math.min(total, 64);
    const cols = 8;
    let cards = "";
    let sumU = 0;
    let maxU = 0;
    let sumMem = 0;
    for (let i = 0; i < show; i++) {
      const n = Math.floor(i / perNode);
      const g = i % perNode;
      const util = Math.round(35 + ((i * 17 + 13) % 55) + (i % 3) * 2);
      const mem = 40 + (i * 7) % 40;
      const temp = 52 + (i * 3) % 28;
      sumU += util;
      maxU = Math.max(maxU, util);
      sumMem += mem;
      const lvl = utilLevel(util);
      cards += `
        <div class="gpu-tile gpu-tile-${lvl}" title="N${n}/G${g}">
          <div class="gpu-tile-id">N${n}/G${g}</div>
          <div class="gpu-tile-util">${util}<span>%</span></div>
          <div class="gpu-tile-bar"><i style="width:${util}%"></i></div>
          <div class="gpu-tile-sub">${mem}/80G · ${temp}°C</div>
        </div>`;
    }
    const mean = (sumU / show).toFixed(0);
    return {
      html: cards,
      mean,
      maxU,
      memMean: (sumMem / show).toFixed(1),
      show,
      nodes,
      perNode,
    };
  }

  function renderMetricsTab(job) {
    const el = $("#panel-metrics");
    if (!el) {
      console.error("[metrics] #panel-metrics not found");
      return;
    }
    try {
      _renderMetricsTabInner(job, el);
    } catch (err) {
      console.error("[metrics] render failed", err);
      el.innerHTML = `<div class="empty-state" style="color:#f87171">任务监控渲染失败：${escapeHtml(String(err.message || err))}</div>`;
    }
  }

  function _renderMetricsTabInner(job, el) {
    const points = 48;
    // 基础设施指标（DCGM / Node / IB），不含训练 Loss / LR 等实验曲线
    const tempSeries = genSeries(62, points, 2.5, 50, 78);
    const powerSeries = genSeries(380, points, 25, 280, 520); // W
    const gpuUtilAvg = genSeries(84, points, 8, 45, 98);
    const smActive = genSeries(78, points, 10, 40, 96);
    const memBw = genSeries(72, points, 9, 35, 95); // 显存带宽利用率 %
    const nvlinkBw = genSeries(280, points, 40, 80, 400); // GB/s 集群侧 NVLink/链路示意
    const pcieBw = genSeries(22, points, 4, 8, 32); // GB/s
    const ibBw = genSeries(260, points, 30, 120, 360);
    const ibRdma = genSeries(200, points, 25, 100, 320);
    const ibRetrans = genSeries(0.4, points, 0.35, 0, 3.5); // 重传/错包率 ‰
    const nodeCpu = genSeries(48, points, 12, 15, 85);
    const nodeMem = genSeries(62, points, 8, 30, 90);

    // 每卡 util / 显存曲线（示意 8 卡）
    const palette = ["#22d3ee", "#a78bfa", "#f472b6", "#4ade80", "#fbbf24", "#60a5fa", "#fb7185", "#34d399"];
    const gpuLines = [0, 1, 2, 3, 4, 5, 6, 7].map((g) => ({
      name: `GPU${g}`,
      color: palette[g],
      values: genSeries(55 + g * 3, points, 12, 20, 98),
    }));
    const memLines = [0, 1, 2, 3, 4, 5, 6, 7].map((g) => ({
      name: `GPU${g}`,
      color: palette[g],
      values: genSeries(60 + g * 2, points, 6, 40, 95),
    }));

    const topo = renderGpuTopo(job);
    const gpuAvg = Math.round(gpuUtilAvg[gpuUtilAvg.length - 1]);
    const memGiB = 76.4;
    const bwGbps = Math.round(ibBw[ibBw.length - 1]);
    const tempNow = Math.round(tempSeries[tempSeries.length - 1]);
    const healthyGpus = Math.max(0, (job.gpus || 64) - (job.status === "failed" ? 1 : 0));

    const xLab = {
      0: "00:00",
      [Math.floor(points / 4)]: "03:30",
      [Math.floor(points / 2)]: "07:00",
      [Math.floor((points * 3) / 4)]: "10:30",
      [points - 1]: "14:00",
    };

    el.innerHTML = `
      <div class="mon-dash">
        <div class="stats-grid stats-grid-4 mon-kpi-row">
          <div class="stat-card" style="--stat-color: var(--primary)">
            <div class="stat-label">GPU 平均利用率</div>
            <div class="stat-value">${gpuAvg}<span class="stat-value-unit">%</span></div>
          </div>
          <div class="stat-card" style="--stat-color: var(--accent)">
            <div class="stat-label">显存平均占用</div>
            <div class="stat-value">${memGiB}<span class="stat-value-unit"> GiB / 80</span></div>
          </div>
          <div class="stat-card" style="--stat-color: var(--info, #22d3ee)">
            <div class="stat-label">IB 带宽</div>
            <div class="stat-value">${bwGbps}<span class="stat-value-unit"> Gbps</span></div>
          </div>
          <div class="stat-card" style="--stat-color: var(--warning)">
            <div class="stat-label">GPU 温度 / 健康卡</div>
            <div class="stat-value">${tempNow}<span class="stat-value-unit">°C</span></div>
            <div class="stat-meta mono">${healthyGpus} / ${job.gpus || "—"} 卡健康</div>
          </div>
        </div>

        <div class="mon-row-2">
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>GPU 利用率 &amp; SM Active</span>
              <span class="text-muted mono" style="font-size:11px">DCGM · last 15m</span>
            </div>
            ${multiLineChart({
              w: 520,
              h: 230,
              unit: "%",
              yMin: 0,
              yMax: 100,
              xLabels: xLab,
              series: [
                { name: "GPU Util", color: "#22d3ee", values: gpuUtilAvg, fill: true, unit: "%" },
                { name: "SM Active", color: "#a78bfa", values: smActive, unit: "%" },
                { name: "显存带宽利用率", color: "#fbbf24", values: memBw, dashed: true, unit: "%" },
              ],
            })}
          </div>
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>GPU 温度 &amp; 功耗</span>
              <div class="mon-panel-head-meta">
                <span class="mon-limit-badge" title="温度告警阈值">limit 90°C</span>
                <span class="text-muted mono" style="font-size:11px">DCGM · last 15m</span>
              </div>
            </div>
            ${multiLineChart({
              w: 520,
              h: 230,
              unit: "°C",
              yMin: 40,
              yMax: 90,
              xLabels: xLab,
              rightAxis: { min: 200, max: 600, unit: "W" },
              series: [
                { name: "温度", color: "#60a5fa", values: tempSeries, yMin: 40, yMax: 90, unit: "°C" },
                { name: "功耗", color: "#4ade80", values: powerSeries, yMin: 200, yMax: 600, unit: "W" },
              ],
            })}
          </div>
        </div>

        <div class="mon-panel mon-topo-panel">
          <div class="mon-panel-head">
            <div>
              <span>GPU 拓扑 · ${topo.show} 卡（${topo.nodes} node × ${topo.perNode} GPU）</span>
              <span class="text-muted" style="font-size:11.5px;margin-left:10px">按节点排列 · 颜色=利用率</span>
            </div>
            <div class="mono text-muted" style="font-size:11.5px">
              util mean <strong style="color:var(--text-0)">${topo.mean}%</strong>
              · max <strong style="color:var(--text-0)">${topo.maxU}%</strong>
            </div>
          </div>
          <div class="gpu-topo-grid">${topo.html}</div>
          <div class="gpu-topo-legend">
            <span><i class="lg-ok"></i>正常 &lt; 80%</span>
            <span><i class="lg-warm"></i>偏高 80–92%</span>
            <span><i class="lg-hot"></i>过热 &gt; 92%</span>
            <span class="text-muted" style="margin-left:auto">数据源 mock · DCGM Exporter</span>
          </div>
        </div>

        <div class="mon-row-3">
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>GPU 利用率 · 8 卡</span>
              <span class="text-muted mono" style="font-size:11px">last 15m</span>
            </div>
            ${multiLineChart({
              w: 360,
              h: 200,
              unit: "%",
              yMin: 0,
              yMax: 100,
              xLabels: xLab,
              series: gpuLines,
            })}
          </div>
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>GPU 显存 · 8 卡</span>
              <span class="text-muted mono" style="font-size:11px">last 15m</span>
            </div>
            ${multiLineChart({
              w: 360,
              h: 200,
              unit: "%",
              yMin: 0,
              yMax: 100,
              xLabels: xLab,
              series: memLines,
            })}
          </div>
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>InfiniBand &amp; RDMA</span>
              <span class="text-muted mono" style="font-size:11px">node-0 / port 0</span>
            </div>
            ${multiLineChart({
              w: 360,
              h: 200,
              unit: "",
              yMin: 0,
              yMax: 400,
              xLabels: xLab,
              series: [
                { name: "port 0 带宽(Gbps)", color: "#38bdf8", values: ibBw, unit: "Gbps" },
                { name: "port 0 RDMA(Gbps)", color: "#4ade80", values: ibRdma, unit: "Gbps" },
                { name: "重传率 ‰", color: "#f87171", values: ibRetrans, yMin: 0, yMax: 4, unit: "‰" },
              ],
            })}
          </div>
        </div>

        <div class="mon-row-2">
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>互联带宽 · NVLink / PCIe</span>
              <span class="text-muted mono" style="font-size:11px">DCGM · last 15m</span>
            </div>
            ${multiLineChart({
              w: 520,
              h: 220,
              unit: "GB/s",
              yMin: 0,
              yMax: 420,
              xLabels: xLab,
              rightAxis: { min: 0, max: 40, unit: "GB/s" },
              series: [
                { name: "NVLink 聚合", color: "#22d3ee", values: nvlinkBw, fill: true, yMin: 0, yMax: 420, unit: "GB/s" },
                { name: "PCIe", color: "#f59e0b", values: pcieBw, yMin: 0, yMax: 40, unit: "GB/s" },
              ],
            })}
          </div>
          <div class="mon-panel">
            <div class="mon-panel-head">
              <span>节点 CPU / 内存</span>
              <span class="text-muted mono" style="font-size:11px">Node Exporter · 任务所在节点均值</span>
            </div>
            ${multiLineChart({
              w: 520,
              h: 220,
              unit: "%",
              yMin: 0,
              yMax: 100,
              xLabels: xLab,
              series: [
                { name: "CPU", color: "#a78bfa", values: nodeCpu, fill: true, unit: "%" },
                { name: "内存", color: "#34d399", values: nodeMem, unit: "%" },
              ],
            })}
          </div>
        </div>
      </div>`;

    // 绑定悬停十字竖线
    bindMultiCharts(el);
  }

  function activateJobDetailTab(tabName) {
    const tab = $(`#job-detail-tabs .tab[data-tab="${tabName}"]`);
    if (tab) tab.click();
    if (tabName) {
      location.hash = `job-detail/${currentJobId}/${tabName}`;
    }
  }

  function renderJobAlertsTab(job) {
    const el = $("#panel-job-alerts");
    const list = sortAlertsNewestFirst(MOCK.alerts.filter((a) => alertJobIds(a).includes(job.id)));
    if (!list.length) {
      el.innerHTML = `<div class="empty-state">该任务暂无关联告警</div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (a) => `
      <div class="alert-item">
        <div class="alert-sev ${a.severity}"></div>
        <div class="alert-body">
          <div class="flex-center gap-8 mb-12" style="justify-content:space-between;flex-wrap:wrap">
            <div class="alert-title">${alertTitleHtml(a)}</div>
            <span class="mono text-muted" style="font-size:11px">${a.time}</span>
          </div>
          <div class="alert-desc">
            <div class="alert-field"><span class="alert-field-k">告警信息</span><span>${escapeHtml(alertInfoOf(a) || "—")}</span></div>
            ${
              faultInfoOf(a)
                ? `<div class="alert-field"><span class="alert-field-k">故障信息</span><span class="text-warning">${escapeHtml(faultInfoOf(a))}</span></div>`
                : ""
            }
            ${alertHandleMetaHtml(a)}
          </div>
          <div class="alert-tags">
            <span class="tag">${a.source}</span>
            ${a.node !== "-" ? `<span class="tag">${a.node}</span>` : ""}
          </div>
          <div class="mt-8 flex gap-8" style="flex-wrap:wrap">
            <button type="button" class="btn btn-primary btn-sm" data-alert-handle="${a.id}">处理告警</button>
            <button type="button" class="btn btn-ghost btn-sm" data-alert-detail="${a.id}">查看详情</button>
            ${
              faultInfoOf(a) && a.node && a.node !== "-" && a.node !== "multi"
                ? `<button class="btn btn-danger btn-sm" data-maint-from-alert="${a.node}">处理节点</button>`
                : ""
            }
          </div>
        </div>
      </div>`
      )
      .join("");
    $$("[data-maint-from-alert]").forEach((b) =>
      b.addEventListener("click", () => {
        navigate("node-mgmt", { highlightNode: b.dataset.maintFromAlert, tab: "nodes" });
        toast(`已跳转节点管理：${b.dataset.maintFromAlert}`);
      })
    );
    bindAlertHandleButtons();
    bindAlertDetailButtons();
  }

  function jobCfgFact(k, v, extraClass = "") {
    return `<div class="job-cfg-fact${extraClass}"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  }

  function jobCfgPath(k, v) {
    const text = v || "—";
    const label = k ? `<span class="k">${k}</span>` : "";
    return `<div class="job-cfg-path">${label}<code class="v" title="${escapeHtml(text)}">${escapeHtml(text)}</code></div>`;
  }

  function jobCfgResourceHtml(job) {
    const r = jobResourcesOf(job);
    const gpn = job?.nodes ? gpusPerNodeOf(job) : null;
    const items = [
      r.nodes != null ? `${r.nodes} 节点` : "",
      gpn ? `${gpn} GPU/节点` : "",
      `${r.gpus} × ${r.gpuType || "—"}`,
      `CPU ${r.cpus}`,
      formatMemGi(r.memGi),
    ].filter(Boolean);
    return `<span class="job-cfg-res">${items
      .map((t) => `<span class="job-cfg-res-item">${escapeHtml(String(t))}</span>`)
      .join("")}</span>`;
  }

  function renderConfigTab(job) {
    const q = findQueue(job.queueId || job.queue);
    const useIB = !!job.requireIB;
    const imageFull = job.image || "—";
    const workdir = job.workdir && job.workdir !== "-" ? job.workdir : "—";
    const mounts = job.configMounts || [];
    const envText = Object.keys(job.env || {}).length
      ? Object.entries(job.env)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")
      : "# 无额外环境变量";
    const mountsHtml = mounts.length
      ? `<div class="job-cfg-mounts">${mounts
          .map(
            (m) => `<div class="job-cfg-mount">
            <div class="job-cfg-mount-title">
              <strong>${escapeHtml(m.displayName || m.setName || "配置集")}</strong>
              <span class="mono text-muted">v${m.version}</span>
            </div>
            <code class="job-cfg-mount-path" title="${escapeHtml(m.mountPath || "")}">${escapeHtml(m.mountPath || "—")}</code>
          </div>`
          )
          .join("")}</div>`
      : `<div class="job-cfg-empty">未挂载配置集 · 启动路径来自镜像或共享盘</div>`;

    $("#panel-config").innerHTML = `
      <div class="job-cfg">
        <div class="job-cfg-grid">
          <section class="job-cfg-panel">
            <div class="job-cfg-panel-head">任务与资源</div>
            <div class="job-cfg-facts">
              ${jobCfgFact("任务名称", escapeHtml(job.name || "—"))}
              ${jobCfgFact(
                "运行用户",
                `${escapeHtml(job.owner || "—")}${
                  job.ownerUsername ? ` <span class="mono text-muted">${escapeHtml(job.ownerUsername)}</span>` : ""
                }`
              )}
              ${
                job.submittedByUsername && job.submittedByUsername !== job.ownerUsername
                  ? jobCfgFact("提交人", escapeHtml(job.submittedBy || job.submittedByUsername))
                  : ""
              }
              ${jobCfgFact("团队", escapeHtml(job.teamName || "—"))}
              ${jobCfgFact("队列", escapeHtml(q?.displayName || job.queue || "—"))}
              ${jobCfgFact("优先级", renderJobPriorityBadge(job.priority))}
              ${jobCfgFact("数据中心", dcBadge(job.dc || q?.dc))}
              ${jobCfgFact(
                "使用 IB",
                `<span class="summary-yesno ${useIB ? "is-yes" : "is-no"}">${useIB ? "是" : "否"}</span>`
              )}
              ${jobCfgFact("资源", jobCfgResourceHtml(job), " is-span")}
              ${
                job.rerunFrom
                  ? jobCfgFact(
                      "重跑自",
                      `<span class="mono link-cell" data-job="${escapeHtml(job.rerunFrom)}" style="cursor:pointer">${escapeHtml(job.rerunFrom)}</span>`,
                      " is-span"
                    )
                  : ""
              }
            </div>
          </section>
          <section class="job-cfg-panel job-cfg-launch">
            <div class="job-cfg-panel-head">启动命令</div>
            ${codeBlockHtml(job.command || "# 无启动命令", "shell", "job-cfg-cmd")}
            <div class="job-cfg-panel-head job-cfg-subhead">环境变量</div>
            ${codeBlockHtml(envText, "env", "job-cfg-env")}
          </section>
          <section class="job-cfg-panel">
            <div class="job-cfg-panel-head">镜像地址</div>
            ${jobCfgPath("", imageFull)}
          </section>
          <section class="job-cfg-panel">
            <div class="job-cfg-panel-head">工作路径</div>
            ${jobCfgPath("", workdir)}
          </section>
          <section class="job-cfg-panel job-cfg-span">
            <div class="job-cfg-panel-head">配置挂载</div>
            ${mountsHtml}
          </section>
        </div>
        ${renderJobConfigSnapshots(job)}
      </div>`;
    bindJobLinks();
    bindJobConfigSnapshots(job);
  }

  function renderJobConfigSnapshots(job) {
    const mounts = job.configMounts || [];
    if (!mounts.length) return "";
    return `<div class="cfg-snapshot-list">
      ${mounts
        .map((m, idx) => {
          const files = m.files || [];
          return `<div class="cfg-snapshot-card" data-snap-idx="${idx}">
            <div class="cfg-snapshot-head">
              <h4>${escapeHtml(m.displayName || m.setName || "配置集")} <span class="mono text-muted">v${m.version}</span></h4>
              <div class="cfg-snapshot-meta">
                <span class="badge badge-info">${escapeHtml(m.materialize || "configmap")}</span>
                <span class="tag mono">${escapeHtml(String(m.digest || "").slice(0, 8))}</span>
                <span class="mono text-muted">${escapeHtml(m.mountPath)}</span>
              </div>
            </div>
            <div class="card-body flush">
              <table class="table cfg-snapshot-files">
                <thead><tr><th>路径</th><th>大小</th><th class="th-actions">操作</th></tr></thead>
                <tbody>
                  ${files
                    .map(
                      (f, fi) => `<tr>
                        <td class="mono">${escapeHtml(f.path)}</td>
                        <td class="mono">${formatBytes(configFileBytes(f))}</td>
                        <td class="td-actions"><button type="button" class="btn btn-ghost btn-sm" data-snap-open="${idx}:${fi}">展开</button></td>
                      </tr>
                      <tr class="hidden" data-snap-body="${idx}:${fi}">
                        <td colspan="3">
                          ${codeBlockHtml(f.content || "", langFromPath(f.path))}
                        </td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>`;
        })
        .join("")}
    </div>`;
  }

  function bindJobConfigSnapshots(job) {
    $$("[data-snap-open]").forEach((b) => {
      b.addEventListener("click", () => {
        const row = document.querySelector(`[data-snap-body="${b.dataset.snapOpen}"]`);
        if (!row) return;
        const hidden = row.classList.toggle("hidden");
        b.textContent = hidden ? "展开" : "收起";
      });
    });
  }

  /* ---------- Platform ---------- */
  function renderPlatform(tab) {
    initTabs("#plat-tabs", "#plat-panels", (t) => {
      if (t === "images") renderImages();
      if (t === "storage") renderStorage();
      if (t === "components") renderComponents();
      if (t === "settings") renderSettings();
    });
    const target = tab || "images";
    const tabBtn = $(`#plat-tabs .tab[data-tab="${target}"]`);
    if (tabBtn) tabBtn.click();
    else renderImages();
  }

  function renderImages() {
    $("#panel-images").innerHTML = `
      <div class="toolbar">
        <div class="search-box"><span class="search-icon">⌕</span>
          <input id="img-search" placeholder="搜索镜像..." />
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-sync-harbor">从 Harbor 同步</button>
      </div>
      <div class="card">
        <div class="card-body flush">
          <table class="table">
            <thead><tr>
              <th>镜像</th><th>框架</th><th>大小</th><th>更新时间</th><th>类型</th><th class="th-actions">操作</th>
            </tr></thead>
            <tbody id="images-tbody">
              ${MOCK.images
                .map(
                  (img) => `
                <tr>
                  <td class="mono" style="font-size:12px">${img.name}</td>
                  <td>${img.framework}</td>
                  <td>${img.size}</td>
                  <td class="mono text-muted">${img.updated}</td>
                  <td>${img.official ? '<span class="badge badge-info">官方预置</span>' : '<span class="badge badge-queued">团队</span>'}</td>
                  <td class="td-actions"><button class="btn btn-ghost btn-sm" data-use-img="${img.name}">用于创建任务</button></td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    $("#btn-sync-harbor")?.addEventListener("click", () => toast("已触发 Harbor 镜像同步"));
    $$("[data-use-img]").forEach((b) =>
      b.addEventListener("click", () => {
        goCreateJob();
        setTimeout(() => {
          const el = $("#create-image");
          if (el) el.value = b.dataset.useImg || "";
          switchCreateFormTab("launch");
          updateCreateSummary();
          toast("已填入镜像地址");
        }, 50);
      })
    );
    $("#img-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      $$("#images-tbody tr").forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  function renderStorage() {
    $("#panel-storage").innerHTML = `
      <div class="stats-grid">
        ${MOCK.storage
          .map(
            (s) => `
          <div class="stat-card" style="--stat-color: var(--purple)">
            <div class="stat-label">${s.name} ${s.dc && s.dc !== "all" ? dcBadge(s.dc) : ""}</div>
            <div class="stat-value" style="font-size:20px">${s.used}</div>
            <div class="stat-meta">${s.type} · ${s.mount}</div>
            <div class="mt-8"><div class="progress"><div class="progress-bar ${s.usage > 80 ? "danger" : s.usage > 60 ? "warn" : "success"}" style="width:${s.usage}%"></div></div>
            <div class="stat-meta mt-8">容量 ${s.capacity} · ${s.usage}% · ${badge(s.status)}</div>
          </div>`
          )
          .join("")}
      </div>
      <div class="card mt-16">
        <div class="card-header"><h3>挂载约定</h3></div>
        <div class="card-body">
          ${codeBlockHtml(
            `# 各机房统一挂载（容器内路径与节点一致）
/data/hpc/home/<user>   # 个人代码、实验输出、个人 checkpoint
/share                  # 预训练数据、分词器、公共配方

# 默认落盘
/data/hpc/home/<user>/workspace
/data/hpc/home/<user>/outputs/<job_id>/
/data/hpc/home/<user>/outputs/<job_id>/checkpoints

# 平台不按机房翻译盘符，也不代为下载数据`,
            "path"
          )}
        </div>
      </div>`;
  }

  function renderComponents() {
    $("#panel-components").innerHTML = `
      <div class="component-list">
        ${MOCK.components
          .map(
            (c) => `
          <div class="component-row">
            <span class="comp-name">${c.name}</span>
            <span class="tag">${c.version}</span>
            <span class="comp-desc">${c.desc}</span>
            ${badge(c.status)}
          </div>`
          )
          .join("")}
      </div>`;
  }

  function renderSettings() {
    const cur = findCluster(getCurrentClusterId()) || defaultCluster();
    const clusterLabel = cur
      ? `${cur.displayName || cur.name} (${cur.name})`
      : MOCK.cluster;
    const clusterCount = (MOCK.clusters || []).length;
    $("#panel-settings").innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>集群信息</h3></div>
          <div class="card-body">
            <div class="kv-list">
              <div class="kv-row"><span class="k">当前集群</span><span class="v">${escapeHtml(clusterLabel)}</span></div>
              <div class="kv-row"><span class="k">已接入集群</span><span class="v">${clusterCount} 个（对等接入）</span></div>
              <div class="kv-row"><span class="k">管理模式</span><span class="v">单集群多数据中心（逻辑统一，可扩展多集群）</span></div>
              <div class="kv-row"><span class="k">数据中心</span><span class="v">${(MOCK.datacenters || []).map((d) => d.name).join(" / ")}</span></div>
              <div class="kv-row"><span class="k">调度后端</span><span class="v">Kubernetes + Volcano</span></div>
              <div class="kv-row"><span class="k">GPU Operator</span><span class="v">${escapeHtml(cur?.gpuOperator || "NVIDIA GPU Operator")}</span></div>
              <div class="kv-row"><span class="k">网络</span><span class="v">${escapeHtml(cur?.network || "IB NDR 400G / 部分无 IB 节点")}</span></div>
              <div class="kv-row"><span class="k">日志存储</span><span class="v">ClickHouse</span></div>
              <div class="kv-row"><span class="k">实验分析</span><span class="v">TensorBoard（按需代理 logdir）</span></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>平台默认策略</h3></div>
          <div class="card-body">
            <div class="kv-list">
              <div class="kv-row"><span class="k">节点数据中心 label</span><span class="v mono">maip.io/datacenter</span></div>
              <div class="kv-row"><span class="k">IB 域 label</span><span class="v mono">maip.io/ib-domain</span></div>
              <div class="kv-row"><span class="k">Gang Scheduling</span><span class="v">开启</span></div>
              <div class="kv-row"><span class="k">拓扑感知调度</span><span class="v">开启（同 IB 域）</span></div>
              <div class="kv-row"><span class="k">故障 GPU 自动隔离</span><span class="v">开启</span></div>
              <div class="kv-row"><span class="k">IB 异常自动隔离</span><span class="v">开启</span></div>
              <div class="kv-row"><span class="k">任务超时（默认）</span><span class="v">168h</span></div>
              <div class="kv-row"><span class="k">日志保留</span><span class="v">30 天</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- 运维中心：数据中心管理 ---------- */
  function renderDcMgmt() {
    renderDcMgmtList();
  }

  function renderDcMgmtList() {
    const body = $("#dc-mgmt-body");
    if (!body) return;
    const list = [...(MOCK.datacenters || [])];
    const total = list.length;
    const pageSize = dcMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (dcMgmtFilter.page > totalPages) dcMgmtFilter.page = totalPages;
    if (dcMgmtFilter.page < 1) dcMgmtFilter.page = 1;
    const start = (dcMgmtFilter.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    body.innerHTML = pageList.length
      ? `<div class="table-wrap"><table class="table">
        <thead><tr>
          <th>数据中心</th><th>标识</th><th>区域</th><th>Label</th><th>关联</th><th class="th-actions">操作</th>
        </tr></thead>
        <tbody>
          ${pageList
            .map((d) => {
              const usage = dcUsageStats(d.id);
              const label = d.label || buildDcLabel(d.labelKey, d.id);
              return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  ${dcBadge(d.id)}
                  <div>
                    <strong>${escapeHtml(d.name)}</strong>
                    ${d.desc ? `<div class="text-muted" style="font-size:11.5px;margin-top:2px;max-width:220px;line-height:1.4">${escapeHtml(d.desc)}</div>` : ""}
                  </div>
                </div>
              </td>
              <td class="mono" style="font-weight:600;color:var(--text-0)">${escapeHtml(d.id)}</td>
              <td>${escapeHtml(d.region || "—")}</td>
              <td class="mono" style="font-size:12px">${escapeHtml(label)}</td>
              <td style="font-size:12px">
                <span title="节点">${usage.nodes} 节点</span>
                <span class="text-muted"> · </span>
                <span title="队列">${usage.queues} 队列</span>
                <span class="text-muted"> · </span>
                <span title="集群">${usage.clusters} 集群</span>
              </td>
              <td class="td-actions">
                <div class="job-actions">
                  <button type="button" class="btn btn-secondary btn-sm" data-dc-edit="${escapeHtml(d.id)}">编辑</button>
                  <button type="button" class="btn btn-danger btn-sm" data-dc-delete="${escapeHtml(d.id)}" title="${
                    usage.total > 0 ? "已关联节点 / 队列 / 集群，无法删除" : "删除数据中心"
                  }">删除</button>
                </div>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>
      ${renderPager({
        total,
        page: dcMgmtFilter.page,
        pageSize,
        key: "dc-mgmt",
      })}`
      : `<div class="empty-state">暂无数据中心，点击「新建数据中心」添加</div>`;

    $$("[data-dc-edit]").forEach((b) =>
      b.addEventListener("click", () => openDcForm(b.dataset.dcEdit))
    );
    $$("[data-dc-delete]").forEach((b) =>
      b.addEventListener("click", () => openDcAction("delete", b.dataset.dcDelete))
    );
    bindPager(
      "dc-mgmt",
      () => ({ page: dcMgmtFilter.page, pageSize: dcMgmtFilter.pageSize, total }),
      (p) => {
        dcMgmtFilter.page = p;
      },
      (s) => {
        dcMgmtFilter.pageSize = s;
      },
      renderDcMgmtList
    );
  }

  /** 锁定标识旁显示「创建后不可改」等提示 */
  function syncFieldLockHint(el, locked, text) {
    if (!el) return;
    const group = el.closest(".form-group");
    if (!group) return;
    let hint = group.querySelector(".field-lock-hint");
    if (locked) {
      if (!hint) {
        hint = document.createElement("span");
        hint.className = "field-lock-hint";
        let row = group.querySelector(":scope > .field-label-row");
        const label = group.querySelector(":scope > label");
        if (!row && label) {
          row = document.createElement("div");
          row.className = "field-label-row";
          label.parentNode.insertBefore(row, label);
          row.appendChild(label);
        }
        if (row) row.appendChild(hint);
        else group.insertBefore(hint, el);
      }
      hint.textContent = text || "不可修改";
    } else if (hint) {
      hint.remove();
    }
  }

  /** GitHub Labels 风格：常用色板。点击色块依次切换，输入框弹出此面板。 */
  const DC_PRESET_COLORS = [
    "#3b82f6",
    "#22d3ee",
    "#a78bfa",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#f472b6",
    "#1d76db",
    "#0052cc",
    "#5319e7",
    "#0e8a16",
    "#006b75",
    "#d93f0b",
    "#fbca04",
    "#b60205",
  ];

  function normalizeHexColor(raw) {
    let v = String(raw || "").trim();
    if (!v) return "";
    if (v[0] !== "#") v = "#" + v;
    if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
      v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return "";
    return "#" + v.slice(1).toLowerCase();
  }

  function isPartialHexColor(raw) {
    const v = String(raw || "").trim();
    if (!v) return true;
    return /^#?[0-9A-Fa-f]{0,6}$/.test(v);
  }

  function hexContrastColor(hex) {
    const n = parseInt(String(hex || "").slice(1), 16);
    if (Number.isNaN(n)) return "#ffffff";
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 >= 148 ? "#111827" : "#ffffff";
  }

  function nextDcPresetColor(current) {
    const cur = normalizeHexColor(current);
    const idx = DC_PRESET_COLORS.indexOf(cur);
    if (idx < 0) return DC_PRESET_COLORS[0];
    return DC_PRESET_COLORS[(idx + 1) % DC_PRESET_COLORS.length];
  }

  function highlightDcPaletteSelection(hex) {
    const color = normalizeHexColor(hex);
    $$("#dc-form-color-grid .dc-color-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.color === color);
      chip.setAttribute("aria-selected", chip.dataset.color === color ? "true" : "false");
    });
  }

  function setDcFormColor(hex, opts = {}) {
    const color = normalizeHexColor(hex) || "";
    const hidden = $("#dc-form-color");
    const text = $("#dc-form-color-text");
    const swatch = $("#dc-form-color-swatch");
    const syncText = opts.syncText !== false;
    if (color) {
      if (hidden) hidden.value = color;
      if (syncText && text) {
        text.value = color;
        text.classList.remove("is-invalid");
      }
      if (swatch) {
        swatch.style.background = color;
        swatch.style.color = hexContrastColor(color);
        swatch.dataset.color = color;
      }
      highlightDcPaletteSelection(color);
    } else if (syncText && text) {
      text.classList.toggle("is-invalid", !isPartialHexColor(text.value));
      highlightDcPaletteSelection("");
    }
  }

  function isDcColorPaletteOpen() {
    const pal = $("#dc-form-color-palette");
    return Boolean(pal && !pal.hidden);
  }

  function openDcColorPalette() {
    const pal = $("#dc-form-color-palette");
    const input = $("#dc-form-color-text");
    const row = $("#dc-color-picker");
    if (!pal) return;
    pal.hidden = false;
    row?.classList.add("is-open");
    input?.setAttribute("aria-expanded", "true");
    highlightDcPaletteSelection(input?.value);
  }

  function closeDcColorPalette() {
    const pal = $("#dc-form-color-palette");
    const input = $("#dc-form-color-text");
    const row = $("#dc-color-picker");
    if (!pal) return;
    pal.hidden = true;
    row?.classList.remove("is-open");
    input?.setAttribute("aria-expanded", "false");
  }

  function renderDcColorPalette() {
    const grid = $("#dc-form-color-grid");
    if (!grid) return;
    grid.innerHTML = DC_PRESET_COLORS.map(
      (c) =>
        `<button type="button" class="dc-color-chip" data-color="${c}" style="background:${c}" title="${c}" aria-label="${c}" role="option"></button>`
    ).join("");
  }

  function cycleDcFormColor() {
    const hidden = $("#dc-form-color");
    const next = nextDcPresetColor(hidden?.value || $("#dc-form-color-text")?.value);
    setDcFormColor(next);
    const swatch = $("#dc-form-color-swatch");
    if (swatch) {
      swatch.classList.remove("is-spinning");
      void swatch.offsetWidth;
      swatch.classList.add("is-spinning");
    }
    closeDcColorPalette();
  }

  function bindDcColorPicker() {
    renderDcColorPalette();
    setDcFormColor($("#dc-form-color")?.value || "#3b82f6");

    $("#dc-form-color-swatch")?.addEventListener("click", (e) => {
      e.preventDefault();
      cycleDcFormColor();
    });

    const input = $("#dc-form-color-text");
    input?.addEventListener("focus", openDcColorPalette);
    input?.addEventListener("click", openDcColorPalette);
    input?.addEventListener("input", (e) => {
      const raw = e.target.value;
      const hex = normalizeHexColor(raw);
      if (hex) setDcFormColor(hex, { syncText: false });
      else {
        e.target.classList.toggle("is-invalid", !isPartialHexColor(raw));
        highlightDcPaletteSelection("");
      }
    });
    input?.addEventListener("blur", (e) => {
      const hex = normalizeHexColor(e.target.value);
      if (hex) setDcFormColor(hex);
    });
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isDcColorPaletteOpen()) {
        e.preventDefault();
        e.stopPropagation();
        closeDcColorPalette();
      }
    });

    $("#dc-form-color-grid")?.addEventListener("mousedown", (e) => {
      const chip = e.target.closest(".dc-color-chip");
      if (!chip) return;
      e.preventDefault();
      setDcFormColor(chip.dataset.color);
    });

    document.addEventListener("mousedown", (e) => {
      const row = $("#dc-color-picker");
      if (!row || !isDcColorPaletteOpen()) return;
      if (!row.contains(e.target)) closeDcColorPalette();
    });
  }

  function updateDcLabelPreview() {
    const id = ($("#dc-form-id")?.value || "").trim();
    const el = $("#dc-form-label-preview");
    if (el) el.textContent = buildDcLabel("maip.io/datacenter", id || "<标识>");
  }

  function openDcForm(dcId) {
    editingDcId = dcId || null;
    const d = dcId ? findDc(dcId) : null;
    const isEdit = !!d;
    const title = $("#modal-dc-title");
    if (title) title.textContent = isEdit ? "编辑数据中心" : "新建数据中心";
    const confirmBtn = $("#modal-dc-confirm");
    if (confirmBtn) confirmBtn.textContent = isEdit ? "保存" : "创建数据中心";

    const set = (sel, val) => {
      const el = $(sel);
      if (el) el.value = val ?? "";
    };
    set("#dc-form-id", d?.id || "");
    set("#dc-form-name", d?.name || "");
    set("#dc-form-short", d?.short || "");
    set("#dc-form-region", d?.region || "");
    set("#dc-form-label-key", "maip.io/datacenter");
    setDcFormColor(d?.color || "#3b82f6");
    closeDcColorPalette();
    set("#dc-form-desc", d?.desc || "");

    const idEl = $("#dc-form-id");
    if (idEl) idEl.readOnly = isEdit;
    syncFieldLockHint(idEl, isEdit, "创建后不可改");

    const keyEl = $("#dc-form-label-key");
    if (keyEl) keyEl.readOnly = true;
    syncFieldLockHint(keyEl, true, "平台固定，不可修改");

    const err = $("#dc-form-error");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    updateDcLabelPreview();
    $("#modal-dc")?.classList.add("show");
    setTimeout(() => $(isEdit ? "#dc-form-name" : "#dc-form-id")?.focus(), 50);
  }

  function closeDcForm() {
    editingDcId = null;
    closeDcColorPalette();
    $("#modal-dc")?.classList.remove("show");
  }

  function submitDcForm() {
    const id = ($("#dc-form-id")?.value || "").trim();
    const name = ($("#dc-form-name")?.value || "").trim();
    const short = ($("#dc-form-short")?.value || "").trim();
    const region = ($("#dc-form-region")?.value || "").trim();
    const labelKey = "maip.io/datacenter";
    let color = normalizeHexColor($("#dc-form-color-text")?.value || $("#dc-form-color")?.value || "");
    const desc = ($("#dc-form-desc")?.value || "").trim();
    const err = $("#dc-form-error");
    const showErr = (msg) => {
      if (err) {
        err.textContent = msg;
        err.style.display = "";
      }
    };

    if (!id || !name || !short) {
      showErr("请填写数据中心标识、显示名称与简称");
      return;
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(id)) {
      showErr("数据中心标识仅支持小写字母、数字与连字符，且不能以连字符开头/结尾");
      return;
    }
    if (!color) {
      const raw = ($("#dc-form-color-text")?.value || "").trim();
      if (raw) {
        showErr("请输入有效的展示色，例如 #3b82f6");
        $("#dc-form-color-text")?.classList.add("is-invalid");
        $("#dc-form-color-text")?.focus();
        return;
      }
      color = "#3b82f6";
    }

    const label = buildDcLabel(labelKey, id);
    const now = "2026-07-27 " + new Date().toTimeString().slice(0, 8);

    if (!editingDcId) {
      if ((MOCK.datacenters || []).some((d) => d.id === id)) {
        showErr("数据中心标识已存在");
        return;
      }
      if (!MOCK.datacenters) MOCK.datacenters = [];
      MOCK.datacenters.push({
        id,
        name,
        short,
        region: region || "—",
        labelKey,
        label,
        color,
        desc,
        createdAt: now,
        updatedAt: now,
      });
      closeDcForm();
      toast(`已创建数据中心 ${name}（${id}）`);
    } else {
      const d = findDc(editingDcId);
      if (!d) {
        showErr("未找到数据中心");
        return;
      }
      d.name = name;
      d.short = short;
      d.region = region || "—";
      d.labelKey = labelKey;
      d.label = buildDcLabel(labelKey, d.id);
      d.color = color;
      d.desc = desc;
      d.updatedAt = now;
      closeDcForm();
      toast(`已保存数据中心 ${name}`);
    }
    renderDcMgmt();
  }

  function setDcActionFooter({ confirmHidden, confirmCls, confirmText, cancelText }) {
    const confirmBtn = $("#modal-dc-action-confirm");
    const cancelBtn = $("#modal-dc-action-cancel");
    if (confirmBtn) {
      if (confirmCls) confirmBtn.className = confirmCls;
      confirmBtn.classList.toggle("hidden", !!confirmHidden);
      confirmBtn.hidden = !!confirmHidden;
      if (confirmText) confirmBtn.textContent = confirmText;
    }
    if (cancelBtn) cancelBtn.textContent = cancelText || "取消";
  }

  function fillDcActionMeta(d, usage) {
    const metaEl = $("#modal-dc-action-meta");
    if (!metaEl) return;
    const region = d.region && d.region !== "—" ? d.region : "";
    metaEl.textContent = [
      d.id,
      region,
      `${usage.nodes}\u00a0节点 · ${usage.queues}\u00a0队列 · ${usage.clusters}\u00a0集群`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  /** 有节点 / 队列 / 集群关联时禁止删除，仅展示原因 */
  function openDcDeleteBlocked(d, usage) {
    pendingDcAction = { action: "blocked", dcId: d.id };
    const name = d.name || d.id;
    const titleEl = $("#modal-dc-action-title");
    const msgEl = $("#modal-dc-action-msg");
    const hintEl = $("#modal-dc-action-hint");
    if (titleEl) titleEl.textContent = "无法删除数据中心";
    if (msgEl) {
      msgEl.innerHTML = `数据中心 <strong>${escapeHtml(name)}</strong> 仍有关联资源，暂不可删除。`;
    }
    fillDcActionMeta(d, usage);
    if (hintEl) setConfirmHint(hintEl, dcDeleteBlockedHint(usage), "delete");
    setDcActionFooter({
      confirmHidden: true,
      confirmCls: "btn btn-danger",
      confirmText: "确认删除",
      cancelText: "知道了",
    });
    $("#modal-dc-action")?.classList.add("show");
  }

  function openDcAction(action, dcId) {
    const d = findDc(dcId);
    if (!d) {
      toast("未找到数据中心", "error");
      return;
    }
    const usage = dcUsageStats(d.id);
    if (action === "delete" && usage.total > 0) {
      openDcDeleteBlocked(d, usage);
      return;
    }

    pendingDcAction = { action, dcId: d.id };
    const name = d.name || d.id;
    const titleEl = $("#modal-dc-action-title");
    const msgEl = $("#modal-dc-action-msg");
    const hintEl = $("#modal-dc-action-hint");
    if (titleEl) titleEl.textContent = "确认删除数据中心";
    if (msgEl) {
      msgEl.innerHTML = `确定要删除数据中心 <strong>${escapeHtml(name)}</strong> 吗？`;
    }
    fillDcActionMeta(d, usage);
    if (hintEl) {
      setConfirmHint(hintEl, "当前无节点、队列或集群引用该数据中心。删除后不可恢复。", "delete");
    }
    setDcActionFooter({
      confirmHidden: false,
      confirmCls: "btn btn-danger",
      confirmText: "确认删除",
      cancelText: "取消",
    });
    $("#modal-dc-action")?.classList.add("show");
  }

  function closeDcAction() {
    pendingDcAction = null;
    setDcActionFooter({
      confirmHidden: false,
      confirmCls: "btn btn-danger",
      confirmText: "确认",
      cancelText: "取消",
    });
    $("#modal-dc-action")?.classList.remove("show");
  }

  function confirmDcAction() {
    const pending = pendingDcAction;
    if (!pending || pending.action === "blocked") {
      closeDcAction();
      return;
    }
    const d = findDc(pending.dcId);
    if (!d) {
      closeDcAction();
      toast("未找到数据中心", "error");
      return;
    }
    if (pending.action === "delete") {
      const usage = dcUsageStats(d.id);
      if (usage.total > 0) {
        openDcDeleteBlocked(d, usage);
        toast("该数据中心仍有关联资源，无法删除", "warning");
        return;
      }
      const removedName = d.name;
      MOCK.datacenters = (MOCK.datacenters || []).filter((x) => x.id !== d.id);
      closeDcAction();
      toast(`已删除数据中心 ${removedName}`, "warning");
    } else {
      closeDcAction();
    }
    renderDcMgmt();
  }

  /* ---------- 运维中心：集群管理 ---------- */
  function renderClusterMgmt() {
    const list = MOCK.clusters || [];
    const healthy = list.filter((c) => c.status === "Healthy").length;
    const readyNodes = list.reduce((s, c) => s + (c.nodesReady || 0), 0);
    const totalNodes = list.reduce((s, c) => s + (c.nodesTotal || 0), 0);
    const res = aggregateClusterResources(list);

    const kpi = $("#cluster-mgmt-kpi");
    if (kpi) {
      kpi.className = "stats-grid stats-grid-4 fault-kpi-row";
      kpi.innerHTML = `
        <div class="stat-card" style="--stat-color: var(--primary)">
          <div class="stat-label">接入集群</div>
          <div class="stat-value">${list.length}</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--success)">
          <div class="stat-label">健康</div>
          <div class="stat-value text-success">${healthy}</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--accent)">
          <div class="stat-label">Ready / 节点</div>
          <div class="stat-value" style="font-size:22px">${readyNodes}<span class="stat-value-unit"> / ${totalNodes}</span></div>
        </div>
        <div class="stat-card" style="--stat-color: var(--purple)">
          <div class="stat-label">GPU 总量</div>
          <div class="stat-value">${res.gpuTotal}</div>
        </div>`;
    }

    const hint = $("#cluster-list-hint");
    if (hint) {
      hint.textContent = list.length
        ? `${list.length} 个集群 · GPU / CPU / 内存为当前实际使用量，非队列已分配额度`
        : "Kubeconfig 接入";
      hint.title = list.length
        ? "GPU / CPU / 内存展示 Running 任务占用相对物理总量，不是队列已分配额度"
        : "";
    }

    renderClusterMgmtList();
  }

  function renderClusterMgmtList() {
    const body = $("#cluster-mgmt-body");
    if (!body) return;
    let list = [...(MOCK.clusters || [])];
    if (clusterMgmtFilter.q) {
      const q = clusterMgmtFilter.q.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.displayName || "").toLowerCase().includes(q) ||
          (c.region || "").toLowerCase().includes(q) ||
          (c.desc || "").toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const pageSize = clusterMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (clusterMgmtFilter.page > totalPages) clusterMgmtFilter.page = totalPages;
    if (clusterMgmtFilter.page < 1) clusterMgmtFilter.page = 1;
    const start = (clusterMgmtFilter.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    body.innerHTML = pageList.length
      ? `<div class="table-wrap"><table class="table">
        <thead><tr>
          <th>集群</th><th>状态</th><th>版本</th><th>数据中心</th><th>Ready / 节点</th><th title="当前实际使用量 / 物理总量，非队列已分配额度">GPU</th><th title="当前实际使用量 / 物理总量，非队列已分配额度">CPU</th><th title="当前实际使用量 / 物理总量，非队列已分配额度">内存</th><th class="th-actions">操作</th>
        </tr></thead>
        <tbody>
          ${pageList
            .map((c) => {
              const dcs = (c.dcs || [])
                .map((id) => dcBadge(id))
                .join(" ") || `<span class="text-muted">—</span>`;
              const r = clusterResourcesOf(c);
              return `
            <tr>
              <td>
                <button type="button" class="cluster-name-link" data-cls-detail="${escapeHtml(c.id)}" title="查看集群详情">
                  ${escapeHtml(c.displayName || c.name)}
                </button>
                ${c.desc ? `<div class="text-muted" style="font-size:11.5px;margin-top:4px;max-width:280px;line-height:1.4">${escapeHtml(c.desc)}</div>` : ""}
              </td>
              <td>${clusterStatusBadge(c.status)}</td>
              <td class="mono">${escapeHtml(c.version || "—")}</td>
              <td><div style="display:flex;flex-wrap:wrap;gap:4px">${dcs}</div></td>
              <td class="mono">${c.nodesReady ?? 0} / ${c.nodesTotal ?? 0}</td>
              <td class="td-cls-gpu">${renderClusterGpuByTypeCell(r)}</td>
              <td class="td-cls-res">${renderClusterUsageCell(r.cpuUsed, r.cpuTotal, { label: "CPU", unit: "核" })}</td>
              <td class="td-cls-res">${renderClusterMemCell(r.memUsedGi, r.memTotalGi)}</td>
              <td class="td-actions">
                <div class="job-actions job-actions-stack">
                  <div class="job-actions-row">
                    <button type="button" class="btn btn-secondary btn-sm" data-cls-test="${c.id}">连通测试</button>
                  </div>
                  <div class="job-actions-row">
                    <button type="button" class="btn btn-secondary btn-sm" data-cls-edit="${c.id}">编辑</button>
                    <button type="button" class="btn btn-danger btn-sm" data-cls-delete="${c.id}">删除</button>
                  </div>
                </div>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>
      ${renderPager({
        total,
        page: clusterMgmtFilter.page,
        pageSize,
        key: "cluster-mgmt",
      })}`
      : `<div class="empty-state">暂无接入集群，点击「接入集群」添加</div>`;

    $$("[data-cls-detail]").forEach((b) =>
      b.addEventListener("click", () => openClusterDetail(b.dataset.clsDetail))
    );
    $$("[data-cls-edit]").forEach((b) =>
      b.addEventListener("click", () => openClusterForm(b.dataset.clsEdit))
    );
    $$("[data-cls-test]").forEach((b) =>
      b.addEventListener("click", () => {
        const c = findCluster(b.dataset.clsTest);
        if (!c) return;
        if (c.status === "Offline") {
          toast(`连通测试失败：${c.displayName || c.name} 不可达`, "error");
          return;
        }
        c.lastSync = "2026-07-27 " + new Date().toTimeString().slice(0, 8);
        if (!c.version || c.version === "—" || c.version === "连通后识别") {
          c.version = "v1.29.6";
        }
        toast(`连通正常：${c.displayName || c.name} · ${c.version}`);
        renderClusterMgmt();
      })
    );
    $$("[data-cls-delete]").forEach((b) =>
      b.addEventListener("click", () => openClusterDeleteConfirm(b.dataset.clsDelete))
    );
    bindPager(
      "cluster-mgmt",
      () => ({ page: clusterMgmtFilter.page, pageSize: clusterMgmtFilter.pageSize, total }),
      (p) => {
        clusterMgmtFilter.page = p;
      },
      (s) => {
        clusterMgmtFilter.pageSize = s;
      },
      renderClusterMgmtList
    );
  }

  function parseKubeconfigServer(raw) {
    const text = String(raw || "");
    const m = text.match(/^\s*server:\s*["']?(\S+?)["']?\s*$/m);
    return m ? m[1] : "";
  }

  function openClusterForm(clusterId) {
    editingClusterId = clusterId || null;
    const c = clusterId ? findCluster(clusterId) : null;
    const isEdit = !!c;
    const title = $("#modal-cluster-title");
    if (title) title.textContent = isEdit ? "编辑集群" : "接入集群";
    const confirmBtn = $("#modal-cluster-confirm");
    if (confirmBtn) confirmBtn.textContent = isEdit ? "保存" : "接入集群";

    const set = (id, val) => {
      const el = $(id);
      if (el) el.value = val ?? "";
    };
    set("#cls-form-display", c?.displayName || "");
    set("#cls-form-desc", c?.desc || "");
    set("#cls-form-kubeconfig", "");
    const reqEl = $("#cls-form-kubeconfig-req");
    if (reqEl) reqEl.style.display = isEdit ? "none" : "";
    const kubeHint = $("#cls-form-kubeconfig-hint");
    if (kubeHint) {
      kubeHint.textContent = isEdit
        ? "留空则沿用已保存的 Kubeconfig；重新粘贴将覆盖。连通后自动识别 API Server 与 Kubernetes 版本。"
        : "仅支持 Kubeconfig 接入。连通成功后自动识别 API Server 与 Kubernetes 版本。";
    }
    const kubeEl = $("#cls-form-kubeconfig");
    if (kubeEl) {
      kubeEl.placeholder = isEdit
        ? "留空沿用已保存凭证，或粘贴新的 kubeconfig YAML 覆盖"
        : "粘贴完整 kubeconfig YAML…";
    }
    const err = $("#cls-form-error");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    $("#modal-cluster")?.classList.add("show");
    setTimeout(() => $("#cls-form-display")?.focus(), 50);
  }

  function closeClusterForm() {
    editingClusterId = null;
    $("#modal-cluster")?.classList.remove("show");
  }

  function submitClusterForm() {
    const displayName = ($("#cls-form-display")?.value || "").trim();
    const desc = ($("#cls-form-desc")?.value || "").trim();
    const kubeconfig = ($("#cls-form-kubeconfig")?.value || "").trim();
    const err = $("#cls-form-error");
    const showErr = (msg) => {
      if (err) {
        err.textContent = msg;
        err.style.display = "";
      }
    };
    if (!displayName) {
      showErr("请填写显示名称");
      return;
    }
    if (!editingClusterId && !kubeconfig) {
      showErr("请粘贴 Kubeconfig");
      return;
    }
    if (
      (MOCK.clusters || []).some(
        (c) => (c.displayName || "") === displayName && c.id !== editingClusterId
      )
    ) {
      showErr("显示名称已存在");
      return;
    }
    const parsedServer = kubeconfig ? parseKubeconfigServer(kubeconfig) : "";
    if (!editingClusterId) {
      const { name, id } = makeClusterKeys(displayName);
      if (!MOCK.clusters) MOCK.clusters = [];
      MOCK.clusters.push({
        id,
        name,
        displayName,
        apiServer: parsedServer || "—",
        version: "连通后识别",
        status: "Healthy",
        provider: "on-prem",
        dcs: [],
        nodesTotal: 0,
        nodesReady: 0,
        gpuTotal: 0,
        gpuUsed: 0,
        network: "—",
        scheduler: "Volcano",
        gpuOperator: "—",
        createdAt: "2026-07-27 " + new Date().toTimeString().slice(0, 8),
        lastSync: "2026-07-27 " + new Date().toTimeString().slice(0, 8),
        desc,
      });
      closeClusterForm();
      toast(`已接入集群 ${displayName}`);
    } else {
      const c = findCluster(editingClusterId);
      if (!c) {
        showErr("未找到集群");
        return;
      }
      c.displayName = displayName;
      c.desc = desc;
      if (kubeconfig && parsedServer) c.apiServer = parsedServer;
      closeClusterForm();
      toast(`已保存集群 ${displayName}`);
    }
    // 同步兼容字段与右上角集群选择
    const def = defaultCluster();
    if (def) MOCK.cluster = def.name;
    initClusterSelect();
    renderClusterMgmt();
  }

  function openClusterDetail(clusterId) {
    const c = findCluster(clusterId);
    if (!c) {
      toast("未找到集群", "error");
      return;
    }
    pendingClusterDetailId = c.id;
    const title = $("#modal-cluster-detail-title");
    if (title) title.textContent = c.displayName || c.name;
    const body = $("#modal-cluster-detail-body");
    if (body) {
      const dcs = (c.dcs || []).map((id) => dcBadge(id)).join(" ") || "—";
      const nodesReady = c.nodesReady ?? 0;
      const nodesTotal = c.nodesTotal ?? 0;
      const r = clusterResourcesOf(c);
      body.innerHTML = `
        <div class="kv-grid">
          <div class="kv-item"><span class="k">状态</span><span class="v">${clusterStatusBadge(c.status)}</span></div>
          <div class="kv-item"><span class="k">K8s 版本</span><span class="v mono">${escapeHtml(c.version || "—")}</span></div>
          <div class="kv-item full"><span class="k">API Server</span><span class="v mono" style="word-break:break-all">${escapeHtml(c.apiServer || "—")}</span></div>
          <div class="kv-item"><span class="k">区域</span><span class="v">${escapeHtml(c.region || "—")}</span></div>
          <div class="kv-item"><span class="k">数据中心</span><span class="v" style="display:flex;flex-wrap:wrap;gap:4px">${dcs}</span></div>
          <div class="kv-item"><span class="k">Ready / 节点</span><span class="v mono">${nodesReady} / ${nodesTotal}</span></div>
          <div class="kv-item"><span class="k">创建时间</span><span class="v mono">${escapeHtml(c.createdAt || "—")}</span></div>
          <div class="kv-item full"><span class="k">GPU</span><span class="v">${renderClusterGpuByTypeCell(r)}</span></div>
          <div class="kv-item"><span class="k">CPU</span><span class="v">${renderClusterUsageCell(r.cpuUsed, r.cpuTotal, { label: "CPU", unit: "核" })}</span></div>
          <div class="kv-item"><span class="k">内存</span><span class="v">${renderClusterMemCell(r.memUsedGi, r.memTotalGi)}</span></div>
          ${c.desc ? `<div class="kv-item full"><span class="k">说明</span><span class="v">${escapeHtml(c.desc)}</span></div>` : ""}
        </div>`;
    }
    $("#modal-cluster-detail")?.classList.add("show");
  }

  function closeClusterDetail() {
    pendingClusterDetailId = null;
    $("#modal-cluster-detail")?.classList.remove("show");
  }

  let pendingClusterDeleteId = null;

  function openClusterDeleteConfirm(clusterId) {
    const c = findCluster(clusterId);
    if (!c) {
      toast("未找到集群", "error");
      return;
    }
    if ((MOCK.clusters || []).length <= 1) {
      toast("至少保留一个接入集群", "error");
      return;
    }
    pendingClusterDeleteId = c.id;
    const nodeCount = (MOCK.nodes || []).filter((n) => n.clusterId === c.id).length;
    const isCurrent = getCurrentClusterId() === c.id;
    const titleEl = $("#modal-cluster-action-title");
    const msgEl = $("#modal-cluster-action-msg");
    const hintEl = $("#modal-cluster-action-hint");
    if (titleEl) titleEl.textContent = "确认删除集群";
    if (msgEl) {
      msgEl.innerHTML = `确定要删除集群 <strong>${escapeHtml(
        c.displayName || c.name
      )}</strong> 吗？`;
    }
    if (hintEl) {
      const bits = ["删除后将断开与该 Kubernetes 集群的连接，此操作不可撤销。"];
      if (nodeCount) bits.push(`所属 ${nodeCount} 台节点将从节点管理中移除。`);
      if (isCurrent) bits.push("该集群为当前工作集群，删除后将自动切换到其余接入集群。");
      setConfirmHint(hintEl, bits.join(""), "delete");
    }
    $("#modal-cluster-action")?.classList.add("show");
  }

  function closeClusterDeleteConfirm() {
    pendingClusterDeleteId = null;
    $("#modal-cluster-action")?.classList.remove("show");
  }

  function confirmClusterDelete() {
    const c = findCluster(pendingClusterDeleteId);
    if (!c) {
      closeClusterDeleteConfirm();
      toast("未找到集群", "error");
      return;
    }
    if ((MOCK.clusters || []).length <= 1) {
      closeClusterDeleteConfirm();
      toast("至少保留一个接入集群", "error");
      return;
    }
    const id = c.id;
    const label = c.displayName || c.name;
    const wasCurrent = getCurrentClusterId() === id;
    MOCK.clusters = (MOCK.clusters || []).filter((x) => x.id !== id);
    MOCK.nodes = (MOCK.nodes || []).filter((n) => n.clusterId !== id);
    if (pendingClusterDetailId === id) pendingClusterDetailId = null;
    if (wasCurrent) {
      const next = defaultCluster();
      if (next) setCurrentClusterId(next.id, { refresh: false });
      else currentClusterId = null;
    }
    const def = defaultCluster();
    if (def) MOCK.cluster = def.name;
    closeClusterDeleteConfirm();
    toast(`已删除集群 ${label}`, "warning");
    initClusterSelect();
    renderClusterMgmt();
  }

  /* ---------- 运维中心：节点管理（K8s 标签 / 污点 + 隔离入池） ---------- */
  function ensureNodeMgmtFilters() {
    const clusterNodes = nodesOfCurrentCluster();
    const dcSel = $("#node-mgmt-filter-dc");
    if (dcSel) {
      const cur = nodeMgmtFilter.dc || "all";
      const unsetCount = clusterNodes.filter((n) => !hasNodeDc(n)).length;
      const dcs = MOCK.datacenters || [];
      dcSel.innerHTML =
        `<option value="all">全部数据中心</option>` +
        `<option value="unset"${cur === "unset" ? " selected" : ""}>未分配${unsetCount ? ` (${unsetCount})` : ""}</option>` +
        dcs
          .map((d) => `<option value="${d.id}" ${cur === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`)
          .join("");
      if (cur !== "all" && cur !== "unset" && !dcs.some((d) => d.id === cur)) {
        nodeMgmtFilter.dc = "all";
        dcSel.value = "all";
      }
    }
    const gpuSel = $("#node-mgmt-filter-gpu");
    if (gpuSel) {
      const types = [...new Set(clusterNodes.map((n) => n.gpuType).filter(Boolean))];
      const cur = nodeMgmtFilter.gpuType || "all";
      gpuSel.innerHTML =
        `<option value="all">全部卡型号</option>` +
        types.map((t) => `<option value="${t}" ${cur === t ? "selected" : ""}>${t}</option>`).join("");
      if (cur !== "all" && !types.includes(cur)) {
        nodeMgmtFilter.gpuType = "all";
        gpuSel.value = "all";
      }
    }
    const stSel = $("#node-mgmt-filter-status");
    if (stSel) {
      if (
        nodeMgmtFilter.status &&
        nodeMgmtFilter.status !== "all" &&
        nodeMgmtFilter.status !== "Ready" &&
        nodeMgmtFilter.status !== "NotReady" &&
        nodeMgmtFilter.status !== "SchedulingDisabled"
      ) {
        nodeMgmtFilter.status = "all";
      }
      stSel.value = nodeMgmtFilter.status || "all";
    }
    const search = $("#node-mgmt-search");
    if (search && search.value !== (nodeMgmtFilter.q || "")) search.value = nodeMgmtFilter.q || "";
  }

  function renderNodeMgmt(opts = {}) {
    if (opts.clusterId) {
      setCurrentClusterId(opts.clusterId, { refresh: false });
      nodeMgmtFilter.page = 1;
    }
    if (opts.highlightNode) {
      highlightNodeMgmtName = opts.highlightNode;
      // 高亮节点时自动切到该节点所属集群
      const hn = findNode(opts.highlightNode);
      if (hn) setCurrentClusterId(hn.clusterId || "cls-primary", { refresh: false });
      nodeMgmtFilter.q = "";
      nodeMgmtFilter.page = 1;
      nodeMgmtPageState.tab = "nodes";
    }
    if (opts.tab) nodeMgmtPageState.tab = opts.tab;

    const all = nodesOfCurrentCluster();
    const isolated = all.filter((n) => maintStateOf(n) === "isolated").length;
    const schedReady = all.filter((n) => maintStateOf(n) === "ready").length;
    const notReady = all.filter((n) => n.status === "NotReady").length;
    const unsetDc = all.filter((n) => !hasNodeDc(n)).length;
    const clusterNodeNames = new Set(all.map((n) => n.name));
    const opsCount = (MOCK.faultOps || []).filter((o) => !o.node || clusterNodeNames.has(o.node)).length;

    const kpi = $("#node-mgmt-kpi");
    if (kpi) {
      kpi.className = "stats-grid stats-grid-5 fault-kpi-row";
      kpi.innerHTML = `
        <div class="stat-card" style="--stat-color: var(--warning)">
          <div class="stat-label">已隔离</div>
          <div class="stat-value text-warning" style="color:var(--warning)">${isolated}</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--success)">
          <div class="stat-label">可调度</div>
          <div class="stat-value text-success">${schedReady}</div>
        </div>
        <div class="stat-card" style="--stat-color: ${unsetDc ? "var(--warning)" : "var(--primary)"}" title="未分配数据中心的节点数">
          <div class="stat-label">未分配数据中心</div>
          <div class="stat-value" style="color:${unsetDc ? "var(--warning)" : "var(--text-0)"}">${unsetDc}</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--danger)">
          <div class="stat-label">NotReady</div>
          <div class="stat-value text-danger">${notReady}</div>
        </div>
        <div class="stat-card" style="--stat-color: var(--purple)">
          <div class="stat-label">维护记录</div>
          <div class="stat-value">${opsCount}</div>
        </div>`;
    }

    initTabs("#node-mgmt-tabs", "#node-mgmt-panels", (tab) => {
      nodeMgmtPageState.tab = tab;
      if (tab === "nodes") {
        ensureNodeMgmtFilters();
        renderNodeMgmtList();
      }
      if (tab === "records") renderNodeMgmtRecordsTab();
    });

    $$("#node-mgmt-tabs .tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === nodeMgmtPageState.tab)
    );
    $$("#node-mgmt-panels .tab-panel").forEach((p) =>
      p.classList.toggle("active", p.dataset.panel === nodeMgmtPageState.tab)
    );

    if (nodeMgmtPageState.tab === "records") {
      renderNodeMgmtRecordsTab();
    } else {
      ensureNodeMgmtFilters();
      renderNodeMgmtList();
    }
  }

  function filteredNodeMgmtList() {
    let list = nodesOfCurrentCluster();
    if (nodeMgmtFilter.dc === "unset") {
      list = list.filter((n) => !hasNodeDc(n));
    } else if (nodeMgmtFilter.dc && nodeMgmtFilter.dc !== "all") {
      list = list.filter((n) => nodeDcId(n) === nodeMgmtFilter.dc);
    }
    if (nodeMgmtFilter.status && nodeMgmtFilter.status !== "all") {
      if (nodeMgmtFilter.status === "SchedulingDisabled") {
        list = list.filter((n) => isNodeCordoned(n));
      } else {
        list = list.filter((n) => k8sNodeReadyState(n) === nodeMgmtFilter.status);
      }
    }
    if (nodeMgmtFilter.gpuType && nodeMgmtFilter.gpuType !== "all") {
      list = list.filter((n) => n.gpuType === nodeMgmtFilter.gpuType);
    }
    if (nodeMgmtFilter.q) {
      const q = nodeMgmtFilter.q.toLowerCase();
      list = list.filter((n) => n.name.toLowerCase().includes(q) || (n.ip || "").toLowerCase().includes(q));
    }
    return list;
  }

  function syncNodeMgmtBatchBar() {
    const bar = $("#node-mgmt-batch-bar");
    const countEl = $("#node-mgmt-batch-count");
    const n = nodeMgmtSelected.size;
    if (countEl) countEl.textContent = `已选 ${n} 台`;
    if (bar) {
      if (n > 0) bar.removeAttribute("hidden");
      else bar.setAttribute("hidden", "");
    }
  }

  function renderNodeMgmtList() {
    const body = $("#node-mgmt-body");
    if (!body) return;
    // 清理已不在当前集群的选择
    const clusterNames = new Set(nodesOfCurrentCluster().map((n) => n.name));
    nodeMgmtSelected = new Set([...nodeMgmtSelected].filter((name) => clusterNames.has(name)));

    const list = filteredNodeMgmtList();
    const total = list.length;
    const pageSize = nodeMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (nodeMgmtFilter.page > totalPages) nodeMgmtFilter.page = totalPages;
    if (nodeMgmtFilter.page < 1) nodeMgmtFilter.page = 1;
    const start = (nodeMgmtFilter.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);
    const pageAllSelected =
      pageList.length > 0 && pageList.every((n) => nodeMgmtSelected.has(n.name));
    const pageSomeSelected = pageList.some((n) => nodeMgmtSelected.has(n.name));

    body.innerHTML = pageList.length
      ? `<div class="table-wrap node-mgmt-table-wrap"><table class="table node-mgmt-table">
        <thead><tr>
          <th class="th-check">
            <input type="checkbox" id="node-mgmt-check-all" title="全选当前页" ${pageAllSelected ? "checked" : ""} ${
              pageSomeSelected && !pageAllSelected ? "data-indeterminate=1" : ""
            } />
          </th>
          <th>节点</th>
          <th>数据中心</th>
          <th>IP</th>
          <th>CPU</th>
          <th>内存</th>
          <th>GPU 用量</th>
          <th>GPU 型号</th>
          <th>状态</th>
          <th>Pods</th>
          <th>隔离信息</th>
          <th class="th-actions th-actions-sticky">操作</th>
        </tr></thead>
        <tbody>
          ${pageList
            .map((n) => {
              const st = maintStateOf(n);
              const hl = highlightNodeMgmtName === n.name ? "fault-row-hl" : "";
              const isoInfo = isolateInfoOf(n);
              const checked = nodeMgmtSelected.has(n.name);
              const dcId = nodeDcId(n);
              return `
            <tr class="${hl}${checked ? " is-row-selected" : ""}" id="node-mgmt-row-${escapeHtml(n.name)}">
              <td class="td-check">
                <input type="checkbox" class="node-mgmt-check" data-nm-check="${escapeHtml(n.name)}" ${
                  checked ? "checked" : ""
                } aria-label="选择 ${escapeHtml(n.name)}" />
              </td>
              <td class="td-node-name">
                <button type="button" class="node-name-link" data-nm-detail="${escapeHtml(n.name)}" title="查看节点详情">
                  <span class="node-name-text">${escapeHtml(n.name)}</span>
                </button>
                <div class="node-name-meta">${escapeHtml(n.roles || "worker")}</div>
              </td>
              <td>${dcBadge(dcId)}</td>
              <td class="mono text-muted">${escapeHtml(n.ip || "—")}</td>
              <td class="td-node-usage">${renderNodeCpuUsageCell(n)}</td>
              <td class="td-node-usage">${renderNodeMemUsageCell(n)}</td>
              <td class="td-node-usage">${renderNodeGpuUsageCell(n)}</td>
              <td class="td-node-gpu-type">
                <span class="node-gpu-type-text" title="${escapeHtml(n.gpuType || "—")}">${formatGpuTypeHtml(n.gpuType || "—")}</span>${
                n.hasIB
                  ? ' <span class="tag" style="background:var(--info-soft);color:var(--info)">IB</span>'
                  : ""
              }
              </td>
              <td>${k8sNodeStatusBadge(n)}</td>
              <td class="td-node-pods">${renderNodePodsCell(n)}</td>
              <td class="td-node-iso" style="max-width:220px;line-height:1.45;font-size:12.5px">${
                st === "isolated" && isoInfo
                  ? escapeHtml(isoInfo)
                  : `<span class="text-muted">—</span>`
              }</td>
              <td class="td-actions td-actions-sticky">
                <div class="job-actions job-actions-stack">
                  <div class="job-actions-row">
                    <button type="button" class="btn btn-secondary btn-sm" data-nm-dc="${escapeHtml(n.name)}" title="设置数据中心">数据中心</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-nm-labels="${escapeHtml(n.name)}">标签</button>
                  </div>
                  <div class="job-actions-row">
                    <button type="button" class="btn btn-secondary btn-sm" data-nm-taints="${escapeHtml(n.name)}">污点</button>
                    ${
                      st !== "isolated"
                        ? `<button type="button" class="btn btn-danger btn-sm" data-nm-iso="${escapeHtml(n.name)}">隔离</button>`
                        : `<button type="button" class="btn btn-primary btn-sm" data-nm-rec="${escapeHtml(n.name)}">入池</button>`
                    }
                  </div>
                </div>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>
      ${renderPager({
        total,
        page: nodeMgmtFilter.page,
        pageSize,
        key: "node-mgmt",
      })}`
      : `<div class="empty-state">当前集群下没有匹配的节点</div>`;

    syncNodeMgmtBatchBar();

    const checkAll = $("#node-mgmt-check-all");
    if (checkAll) {
      if (pageSomeSelected && !pageAllSelected) checkAll.indeterminate = true;
      checkAll.addEventListener("change", () => {
        pageList.forEach((n) => {
          if (checkAll.checked) nodeMgmtSelected.add(n.name);
          else nodeMgmtSelected.delete(n.name);
        });
        renderNodeMgmtList();
      });
    }
    $$(".node-mgmt-check").forEach((cb) =>
      cb.addEventListener("change", () => {
        const name = cb.dataset.nmCheck;
        if (!name) return;
        if (cb.checked) nodeMgmtSelected.add(name);
        else nodeMgmtSelected.delete(name);
        renderNodeMgmtList();
      })
    );

    $$("[data-nm-detail]").forEach((b) =>
      b.addEventListener("click", () => openNodeDetail(b.dataset.nmDetail))
    );
    $$("[data-nm-dc]").forEach((b) =>
      b.addEventListener("click", () => openNodeDcForm([b.dataset.nmDc]))
    );
    $$("[data-nm-labels]").forEach((b) =>
      b.addEventListener("click", () => openNodeLabelsEditor(b.dataset.nmLabels))
    );
    $$("[data-nm-taints]").forEach((b) =>
      b.addEventListener("click", () => openNodeTaintsEditor(b.dataset.nmTaints))
    );
    $$("[data-nm-iso]").forEach((b) =>
      b.addEventListener("click", () => openMaintAction("isolate", b.dataset.nmIso))
    );
    $$("[data-nm-rec]").forEach((b) =>
      b.addEventListener("click", () => openMaintAction("recover", b.dataset.nmRec))
    );
    bindPager(
      "node-mgmt",
      () => ({ page: nodeMgmtFilter.page, pageSize: nodeMgmtFilter.pageSize, total }),
      (p) => {
        nodeMgmtFilter.page = p;
      },
      (s) => {
        nodeMgmtFilter.pageSize = s;
      },
      renderNodeMgmtList
    );

    if (highlightNodeMgmtName) {
      const name = highlightNodeMgmtName;
      const idx = list.findIndex((n) => n.name === name);
      if (idx >= 0) {
        const targetPage = Math.floor(idx / pageSize) + 1;
        if (targetPage !== nodeMgmtFilter.page) {
          nodeMgmtFilter.page = targetPage;
          highlightNodeMgmtName = name;
          renderNodeMgmtList();
          return;
        }
      }
      const row = document.getElementById(`node-mgmt-row-${name}`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => {
        highlightNodeMgmtName = null;
      }, 2500);
    }
  }

  function openNodeDcForm(nodeNames) {
    const names = [...new Set((nodeNames || []).filter(Boolean))];
    if (!names.length) {
      toast("请先选择节点", "warning");
      return;
    }
    const missing = names.filter((name) => !findNode(name));
    if (missing.length) {
      toast("部分节点不存在", "error");
      return;
    }
    pendingNodeDcNames = names;
    const countEl = $("#node-dc-form-count");
    if (countEl) countEl.textContent = `（${names.length} 台）`;
    const targets = $("#node-dc-form-targets");
    if (targets) {
      const show = names.slice(0, 12);
      const more = names.length - show.length;
      targets.innerHTML =
        show
          .map((name) => {
            const n = findNode(name);
            const cur = nodeDcId(n);
            return `<span class="node-dc-chip mono" title="${escapeHtml(cur ? `当前：${dcName(cur)}` : "当前：未分配")}">${escapeHtml(
              name
            )}${cur ? "" : '<i class="node-dc-chip-dot" title="未分配"></i>'}</span>`;
          })
          .join("") +
        (more > 0 ? `<span class="text-muted" style="font-size:12px">+${more} 台</span>` : "");
    }
    const sel = $("#node-dc-form-select");
    if (sel) {
      const dcs = MOCK.datacenters || [];
      // 若仅单节点且已有数据中心，预选当前值
      let preferred = "";
      if (names.length === 1) preferred = nodeDcId(findNode(names[0])) || "";
      sel.innerHTML =
        `<option value="">请选择数据中心</option>` +
        dcs
          .map(
            (d) =>
              `<option value="${escapeHtml(d.id)}" ${d.id === preferred ? "selected" : ""}>${escapeHtml(
                d.name
              )} · ${escapeHtml(d.id)}</option>`
          )
          .join("");
    }
    const err = $("#node-dc-form-error");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    const title = $("#modal-node-dc-title");
    if (title) title.textContent = names.length > 1 ? "批量设置数据中心" : "设置数据中心";
    $("#modal-node-dc")?.classList.add("show");
  }

  function closeNodeDcForm() {
    pendingNodeDcNames = null;
    $("#modal-node-dc")?.classList.remove("show");
  }

  function submitNodeDcForm() {
    const names = pendingNodeDcNames || [];
    if (!names.length) {
      closeNodeDcForm();
      return;
    }
    const dcId = ($("#node-dc-form-select")?.value || "").trim();
    const err = $("#node-dc-form-error");
    if (!dcId) {
      if (err) {
        err.textContent = "请选择数据中心";
        err.style.display = "";
      }
      return;
    }
    const dc = findDc(dcId);
    if (!dc) {
      if (err) {
        err.textContent = "数据中心不存在";
        err.style.display = "";
      }
      return;
    }
    let ok = 0;
    names.forEach((name) => {
      const n = findNode(name);
      if (!n) return;
      const prev = nodeDcId(n);
      applyNodeDatacenter(n, dcId);
      if (prev !== dcId) {
        recordNodeMaintOp({
          action: "set-dc",
          node: name,
          remark: formatDcChangeRemark(prev, dcId),
        });
      }
      ok += 1;
    });
    // 已成功设置的节点取消勾选
    names.forEach((name) => nodeMgmtSelected.delete(name));
    closeNodeDcForm();
    toast(`已为 ${ok} 台节点设置数据中心：${dc.name}`);
    if ($("#page-node-mgmt")?.classList.contains("active")) renderNodeMgmt();
    if (pendingNodeDetailName && names.includes(pendingNodeDetailName)) {
      openNodeDetail(pendingNodeDetailName);
    }
  }

  function renderNodeMgmtRecordsTab() {
    const clusterNodeNames = new Set(nodesOfCurrentCluster().map((n) => n.name));
    let ops = (MOCK.faultOps || []).filter((o) => !o.node || clusterNodeNames.has(o.node));
    if (nodeMgmtPageState.opsAction && nodeMgmtPageState.opsAction !== "all") {
      ops = ops.filter((o) => o.action === nodeMgmtPageState.opsAction);
    }
    if (nodeMgmtPageState.opsQ) {
      const q = nodeMgmtPageState.opsQ.toLowerCase();
      ops = ops.filter(
        (o) =>
          o.node.toLowerCase().includes(q) ||
          (o.remark || o.reason || "").toLowerCase().includes(q) ||
          (o.operator || "").toLowerCase().includes(q) ||
          (o.id || "").toLowerCase().includes(q) ||
          maintActionLabel(o.action).toLowerCase().includes(q)
      );
    }

    const total = ops.length;
    const pageSize = nodeMgmtPageState.opsPageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (nodeMgmtPageState.opsPage > totalPages) nodeMgmtPageState.opsPage = totalPages;
    if (nodeMgmtPageState.opsPage < 1) nodeMgmtPageState.opsPage = 1;
    const start = (nodeMgmtPageState.opsPage - 1) * pageSize;
    const pageOps = ops.slice(start, start + pageSize);

    const toolbar = $("#node-mgmt-records-toolbar");
    if (toolbar) {
      toolbar.innerHTML = `
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input id="node-mgmt-records-search" placeholder="搜索节点 / 操作人 / 备注..." value="${escapeHtml(nodeMgmtPageState.opsQ)}" />
        </div>
        <div class="alert-filter-group">
          <span class="alert-filter-label">操作类型</span>
          <div class="alert-chip-group">
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "all" ? "active" : ""}" data-nmra="all">全部</button>
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "isolate" ? "active" : ""}" data-nmra="isolate">隔离</button>
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "recover" ? "active" : ""}" data-nmra="recover">入池</button>
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "set-dc" ? "active" : ""}" data-nmra="set-dc">数据中心</button>
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "labels" ? "active" : ""}" data-nmra="labels">标签</button>
            <button type="button" class="alert-chip ${nodeMgmtPageState.opsAction === "taints" ? "active" : ""}" data-nmra="taints">污点</button>
          </div>
        </div>`;
    }

    $$("[data-nmra]").forEach((b) =>
      b.addEventListener("click", () => {
        nodeMgmtPageState.opsAction = b.dataset.nmra;
        nodeMgmtPageState.opsPage = 1;
        renderNodeMgmtRecordsTab();
      })
    );
    $("#node-mgmt-records-search")?.addEventListener("input", (e) => {
      nodeMgmtPageState.opsQ = e.target.value || "";
      nodeMgmtPageState.opsPage = 1;
      renderNodeMgmtRecordsTab();
    });

    const listEl = $("#node-mgmt-records-list");
    if (!listEl) return;
    listEl.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作</th>
              <th>节点</th>
              <th>操作人</th>
              <th>备注</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            ${
              pageOps.length
                ? pageOps
                    .map(
                      (o) => `
              <tr>
                <td class="mono text-muted">${o.time}</td>
                <td><span class="badge ${maintActionBadgeCls(o.action)}">${maintActionLabel(o.action)}</span></td>
                <td class="mono" style="color:var(--text-0);font-weight:500">${o.node}</td>
                <td>${escapeHtml(o.operator)}</td>
                <td style="max-width:360px">${escapeHtml(o.remark || o.reason || "—")}</td>
                <td>${o.result === "success" ? badge("success") : badge("failed")}</td>
              </tr>`
                    )
                    .join("")
                : `<tr><td colspan="6"><div class="empty-state">暂无维护记录</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${renderPager({
        total,
        page: nodeMgmtPageState.opsPage,
        pageSize,
        key: "node-mgmt-records",
      })}`;

    bindPager(
      "node-mgmt-records",
      () => ({
        page: nodeMgmtPageState.opsPage,
        pageSize: nodeMgmtPageState.opsPageSize,
        total,
      }),
      (p) => {
        nodeMgmtPageState.opsPage = p;
      },
      (s) => {
        nodeMgmtPageState.opsPageSize = s;
      },
      renderNodeMgmtRecordsTab
    );
  }

  /** 将节点 mock 数据渲染为类 kubectl get node -o yaml 的 YAML 文本 */
  function yamlScalar(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    const s = String(v);
    if (s === "") return '""';
    // 安全未加引号：字母数字 / 点 / 斜杠 / 中划线 / 下划线
    if (/^[A-Za-z0-9_./:-]+$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s)) {
      return s;
    }
    return JSON.stringify(s);
  }

  function buildNodeYaml(n) {
    if (!n) return "";
    const labels = nodeLabelsOf(n);
    const taints = nodeTaintsOf(n);
    const cordoned = isNodeCordoned(n);
    const podInfo = nodePodsOf(n);
    const conditions = nodeConditionsOf(n);
    const gpuCount = Array.isArray(n.gpus) ? n.gpus.length : 8;
    const lines = [];
    const push = (indent, text) => lines.push(`${"  ".repeat(indent)}${text}`);

    push(0, "apiVersion: v1");
    push(0, "kind: Node");
    push(0, "metadata:");
    push(1, `name: ${yamlScalar(n.name)}`);
    push(1, "creationTimestamp: \"2026-01-15T08:12:00Z\"");
    push(1, "labels:");
    const labelKeys = Object.keys(labels).sort();
    if (labelKeys.length) {
      labelKeys.forEach((k) => {
        const v = labels[k];
        // K8s 中空字符串 value 常写作 key: ""
        push(2, `${k}: ${v === "" || v == null ? '""' : yamlScalar(v)}`);
      });
    } else {
      push(2, "{}");
    }
    push(0, "spec:");
    if (cordoned) {
      push(1, "unschedulable: true");
    } else {
      push(1, "unschedulable: false");
    }
    if (taints.length) {
      push(1, "taints:");
      taints.forEach((t) => {
        push(2, `- key: ${yamlScalar(t.key)}`);
        if (t.value !== undefined && t.value !== null && t.value !== "") {
          push(3, `value: ${yamlScalar(t.value)}`);
        }
        push(3, `effect: ${yamlScalar(t.effect || "NoSchedule")}`);
      });
    } else {
      push(1, "taints: []");
    }
    push(0, "status:");
    push(1, "addresses:");
    push(2, `- type: InternalIP`);
    push(3, `address: ${yamlScalar(n.ip || "0.0.0.0")}`);
    push(2, `- type: Hostname`);
    push(3, `address: ${yamlScalar(n.name)}`);
    push(1, "conditions:");
    conditions.forEach((c) => {
      push(2, `- type: ${yamlScalar(c.type)}`);
      push(3, `status: ${yamlScalar(c.status)}`);
      push(3, `reason: ${yamlScalar(c.reason)}`);
      push(3, `message: ${yamlScalar(c.message)}`);
      push(3, `lastHeartbeatTime: ${yamlScalar(c.lastHeartbeatTime)}`);
      push(3, `lastTransitionTime: ${yamlScalar(c.lastTransitionTime)}`);
    });
    push(1, "capacity:");
    push(2, 'cpu: "128"');
    push(2, "memory: 1048576Mi");
    push(2, `pods: ${yamlScalar(String(podInfo.capacity))}`);
    push(2, `nvidia.com/gpu: ${yamlScalar(String(gpuCount))}`);
    push(2, "ephemeral-storage: 4Ti");
    push(1, "allocatable:");
    push(2, 'cpu: "126"');
    push(2, "memory: 1024000Mi");
    push(2, `pods: ${yamlScalar(String(podInfo.capacity))}`);
    push(2, `nvidia.com/gpu: ${yamlScalar(String(gpuCount))}`);
    push(2, "ephemeral-storage: 3.5Ti");
    push(1, "nodeInfo:");
    push(2, "architecture: amd64");
    push(2, "operatingSystem: linux");
    push(2, "osImage: Ubuntu 22.04.4 LTS");
    push(2, "kernelVersion: 5.15.0-105-generic");
    push(2, "containerRuntimeVersion: containerd://1.7.20");
    push(2, "kubeletVersion: v1.29.6");
    push(2, "kubeProxyVersion: v1.29.6");
    // 平台扩展字段（注释）
    lines.push("");
    lines.push("# Platform extensions (not part of core Node API)");
    lines.push(`# cluster: ${clusterName(n.clusterId || "cls-primary")}`);
    lines.push(`# datacenter: ${nodeDcId(n) || "unset"}`);
    lines.push(`# gpuType: ${n.gpuType || "-"}`);
    lines.push(`# hasIB: ${n.hasIB ? "true" : "false"}`);
    lines.push(`# isolateState: ${n.isolateState || "healthy"}`);
    return lines.join("\n");
  }

  function openNodeDetail(nodeName) {
    const n = findNode(nodeName);
    if (!n) {
      toast("未找到节点", "error");
      return;
    }
    pendingNodeDetailName = n.name;
    const st = maintStateOf(n);
    const title = $("#modal-node-detail-title");
    if (title) title.textContent = n.name;
    const body = $("#modal-node-detail-body");
    if (body) {
      const labels = nodeLabelsOf(n);
      const taints = nodeTaintsOf(n);
      const isoInfo = st === "isolated" ? isolateInfoOf(n) : "";
      const yamlText = buildNodeYaml(n);
      const labelCount = Object.keys(labels).length;
      const taintCount = (taints || []).length;
      body.innerHTML = `
        <div class="tabs node-detail-tabs" id="node-detail-tabs" role="tablist">
          <button type="button" class="tab active" data-tab="overview" role="tab" aria-selected="true">概览</button>
          <button type="button" class="tab" data-tab="labels" role="tab" aria-selected="false">标签<span class="tab-count ${labelCount ? "" : "is-zero"}">${labelCount}</span></button>
          <button type="button" class="tab" data-tab="taints" role="tab" aria-selected="false">污点<span class="tab-count ${taintCount ? "" : "is-zero"}">${taintCount}</span></button>
          <button type="button" class="tab" data-tab="yaml" role="tab" aria-selected="false">YAML</button>
        </div>
        <div class="node-detail-panels" id="node-detail-panels">
          <div class="tab-panel active" data-panel="overview" role="tabpanel">
            <div class="kv-grid">
              <div class="kv-item"><span class="k">节点</span><span class="v mono">${escapeHtml(n.name)}</span></div>
              <div class="kv-item"><span class="k">状态</span><span class="v">${k8sNodeStatusBadge(n)}</span></div>
              <div class="kv-item"><span class="k">集群</span><span class="v">${escapeHtml(clusterName(n.clusterId || "cls-primary"))}</span></div>
              <div class="kv-item"><span class="k">数据中心</span><span class="v" style="display:inline-flex;align-items:center;gap:8px">${dcBadge(nodeDcId(n))}${
                !hasNodeDc(n)
                  ? `<button type="button" class="btn btn-secondary btn-sm" id="modal-node-detail-set-dc">设置</button>`
                  : `<button type="button" class="btn btn-ghost btn-sm" id="modal-node-detail-set-dc">修改</button>`
              }</span></div>
              <div class="kv-item"><span class="k">IP</span><span class="v mono">${escapeHtml(n.ip || "—")}</span></div>
              <div class="kv-item"><span class="k">角色</span><span class="v">${escapeHtml(n.roles || "worker")}</span></div>
              <div class="kv-item"><span class="k">GPU 型号</span><span class="v">${escapeHtml(n.gpuType || "—")}</span></div>
              <div class="kv-item"><span class="k">支持 IB</span><span class="v">${
                n.hasIB
                  ? '<span class="tag" style="background:var(--info-soft);color:var(--info)">是</span>'
                  : '<span class="text-muted">否</span>'
              }</span></div>
              <div class="kv-item full"><span class="k">资源用量</span><span class="v">${renderNodeCpuMemDetail(n)}</span></div>
              <div class="kv-item"><span class="k">Pods</span><span class="v">${renderNodePodsCell(n)}</span></div>
              <div class="kv-item"><span class="k">调度状态</span><span class="v">${maintStateBadge(st)}</span></div>
              <div class="kv-item full"><span class="k">Conditions</span><span class="v node-condition-tags">${renderNodeConditionTags(n)}</span></div>
              ${
                isoInfo
                  ? `<div class="kv-item full"><span class="k">隔离信息</span><span class="v">${escapeHtml(isoInfo)}</span></div>`
                  : ""
              }
            </div>
          </div>
          <div class="tab-panel" data-panel="labels" role="tabpanel">
            <div class="node-detail-section">
              <div class="node-detail-section-title">Labels（${labelCount}）</div>
              ${renderK8sLabels(labels, { max: 80 })}
            </div>
          </div>
          <div class="tab-panel" data-panel="taints" role="tabpanel">
            <div class="node-detail-section">
              <div class="node-detail-section-title">Taints（${taintCount}）</div>
              ${renderK8sTaints(taints, { max: 40 })}
            </div>
          </div>
          <div class="tab-panel" data-panel="yaml" role="tabpanel">
            <div class="node-kubectl-get">
              <div class="node-yaml-hint mono">kubectl get node ${escapeHtml(n.name)}</div>
              <div class="table-wrap">
                <table class="table node-kubectl-table">
                  <thead><tr><th>NAME</th><th>STATUS</th><th>ROLES</th><th>AGE</th><th>VERSION</th></tr></thead>
                  <tbody>
                    <tr>
                      <td class="mono">${escapeHtml(n.name)}</td>
                      <td class="mono">${escapeHtml(k8sNodeKubectlStatus(n))}</td>
                      <td>${escapeHtml(n.roles || "worker")}</td>
                      <td>193d</td>
                      <td class="mono">v1.29.6</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="node-yaml-toolbar">
              <span class="node-yaml-hint mono">kubectl get node ${escapeHtml(n.name)} -o yaml</span>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-node-yaml-copy" title="复制 YAML">复制</button>
            </div>
            ${codeBlockHtml(yamlText, "yaml", "node-yaml-block", 'id="node-detail-yaml"')}
          </div>
        </div>`;

      initTabs("#node-detail-tabs", "#node-detail-panels", (tab) => {
        $$("#node-detail-tabs .tab").forEach((t) => {
          t.setAttribute("aria-selected", t.dataset.tab === tab ? "true" : "false");
        });
      });

      $("#btn-node-yaml-copy")?.addEventListener("click", async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(yamlText);
          } else {
            const ta = document.createElement("textarea");
            ta.value = yamlText;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          }
          toast("YAML 已复制到剪贴板", "success");
        } catch {
          toast("复制失败，请手动选择复制", "warning");
        }
      });
    }
    const isoBtn = $("#modal-node-detail-isolate");
    const recBtn = $("#modal-node-detail-recover");
    if (isoBtn) isoBtn.style.display = st === "isolated" ? "none" : "";
    if (recBtn) recBtn.style.display = st === "isolated" ? "" : "none";
    $("#modal-node-detail-set-dc")?.addEventListener("click", () => {
      openNodeDcForm([n.name]);
    });
    $("#modal-node-detail")?.classList.add("show");
  }

  function closeNodeDetail() {
    pendingNodeDetailName = null;
    $("#modal-node-detail")?.classList.remove("show");
  }

  function renderNodeLabelsEditorUI(opts = {}) {
    const el = $("#node-labels-editor");
    if (!el || !pendingNodeLabelsDraft) return;
    const entries = Object.entries(pendingNodeLabelsDraft);
    el.innerHTML = entries.length
      ? entries
          .map(
            ([k, v], idx) => `
        <div class="node-label-row" data-label-idx="${idx}">
          <input type="text" class="node-label-k" value="${escapeHtml(k)}" spellcheck="false" autocomplete="off" maxlength="${K8S_QNAME_KEY_MAX}" aria-label="标签 key" />
          <input type="text" class="node-label-v" value="${escapeHtml(v ?? "")}" placeholder="(empty)" spellcheck="false" autocomplete="off" maxlength="${K8S_LABEL_VALUE_MAX}" aria-label="标签 value" />
          <button type="button" class="btn btn-danger btn-sm" data-label-del-idx="${idx}" title="删除">删除</button>
        </div>`
          )
          .join("")
      : `<div class="node-editor-empty">${
          pendingNodeLabelsMode === "merge"
            ? "批量写入列表为空，请在下方添加要合并的标签"
            : "暂无标签，请在下方添加"
        }</div>`;

    $$("#node-labels-editor .node-label-row").forEach((row) => {
      const kEl = row.querySelector(".node-label-k");
      const vEl = row.querySelector(".node-label-v");
      kEl?.addEventListener("input", () => clearNodeFieldInvalid(kEl, "#node-labels-error"));
      vEl?.addEventListener("input", () => clearNodeFieldInvalid(vEl, "#node-labels-error"));
      kEl?.addEventListener("blur", () => {
        const key = (kEl.value || "").trim();
        if (!key) return;
        const msg = k8sQualifiedNameError(key, "标签 key");
        setInputInvalid(kEl, !!msg);
        if (msg) setNodeEditorError($("#node-labels-error"), msg);
      });
      vEl?.addEventListener("blur", () => {
        const value = (vEl.value || "").trim();
        const msg = k8sLabelValueError(value, "标签 value");
        setInputInvalid(vEl, !!msg);
        if (msg) setNodeEditorError($("#node-labels-error"), msg);
      });
    });

    $$("[data-label-del-idx]").forEach((b) =>
      b.addEventListener("click", () => {
        const idx = +b.dataset.labelDelIdx;
        if (Number.isNaN(idx) || !pendingNodeLabelsDraft) return;
        // 先收集当前编辑内容，再按索引删除，保证其它行的修改不丢失
        const list = listNodeLabelRowsFromUI();
        if (idx < 0 || idx >= list.length) return;
        list.splice(idx, 1);
        pendingNodeLabelsDraft = Object.fromEntries(list.filter((r) => r.key).map((r) => [r.key, r.value]));
        renderNodeLabelsEditorUI();
      })
    );

    if (opts.scrollToEnd && entries.length) {
      el.scrollTop = el.scrollHeight;
      const lastRow = el.querySelector(".node-label-row:last-child .node-label-k");
      lastRow?.focus();
    }
  }

  function listNodeLabelRowsFromUI() {
    return $$("#node-labels-editor .node-label-row").map((row) => {
      const kEl = row.querySelector(".node-label-k");
      const vEl = row.querySelector(".node-label-v");
      return {
        row,
        kEl,
        vEl,
        key: (kEl?.value || "").trim(),
        value: (vEl?.value ?? "").trim(),
      };
    });
  }

  function collectNodeLabelsDraftFromUI() {
    const draft = {};
    listNodeLabelRowsFromUI().forEach(({ key, value }) => {
      if (key) draft[key] = value;
    });
    return draft;
  }

  function validateNodeLabelsDraftRows() {
    const rows = listNodeLabelRowsFromUI();
    rows.forEach(({ kEl, vEl }) => {
      setInputInvalid(kEl, false);
      setInputInvalid(vEl, false);
    });
    const seen = new Map();
    for (let i = 0; i < rows.length; i++) {
      const { kEl, vEl, key, value } = rows[i];
      const prefix = `第 ${i + 1} 行：`;
      if (!key) {
        setInputInvalid(kEl, true);
        kEl?.scrollIntoView({ block: "nearest" });
        kEl?.focus();
        return `${prefix}标签 key 不能为空，请填写或删除该行`;
      }
      const keyErr = k8sQualifiedNameError(key, "标签 key");
      if (keyErr) {
        setInputInvalid(kEl, true);
        kEl?.scrollIntoView({ block: "nearest" });
        kEl?.focus();
        return prefix + keyErr;
      }
      const valErr = k8sLabelValueError(value, "标签 value");
      if (valErr) {
        setInputInvalid(vEl, true);
        vEl?.scrollIntoView({ block: "nearest" });
        vEl?.focus();
        return prefix + valErr;
      }
      if (seen.has(key)) {
        setInputInvalid(kEl, true);
        setInputInvalid(seen.get(key), true);
        kEl?.scrollIntoView({ block: "nearest" });
        kEl?.focus();
        return `${prefix}标签 key「${key}」重复`;
      }
      seen.set(key, kEl);
    }
    return "";
  }

  function pendingNodeLabelAddInput() {
    return {
      kEl: $("#node-label-key"),
      vEl: $("#node-label-value"),
      key: ($("#node-label-key")?.value || "").trim(),
      value: ($("#node-label-value")?.value ?? "").trim(),
    };
  }

  function renderNodeBatchTargetChips(elId, names) {
    const el = $(elId);
    if (!el) return;
    const list = names || [];
    if (!list.length) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    const show = list.slice(0, 12);
    const more = list.length - show.length;
    el.innerHTML =
      show.map((name) => `<span class="node-dc-chip mono">${escapeHtml(name)}</span>`).join("") +
      (more > 0 ? `<span class="text-muted" style="font-size:12px">+${more} 台</span>` : "");
    el.hidden = false;
  }

  /** @param {string|string[]} nodeNameOrNames */
  function openNodeLabelsEditor(nodeNameOrNames) {
    const names = [...new Set((Array.isArray(nodeNameOrNames) ? nodeNameOrNames : [nodeNameOrNames]).filter(Boolean))];
    if (!names.length) {
      toast("请先选择节点", "warning");
      return;
    }
    const missing = names.filter((name) => !findNode(name));
    if (missing.length === names.length) {
      toast("未找到节点", "error");
      return;
    }
    const valid = names.filter((name) => findNode(name));
    pendingNodeLabelsNames = valid;
    pendingNodeLabelsMode = valid.length > 1 ? "merge" : "replace";
    // 单节点：编辑现有全量标签；批量：仅编辑待合并写入的标签（从空开始）
    pendingNodeLabelsDraft =
      pendingNodeLabelsMode === "replace" ? nodeLabelsOf(findNode(valid[0])) : {};
    const title = $("#modal-node-labels-title");
    if (title) {
      title.textContent =
        pendingNodeLabelsMode === "merge"
          ? `批量设置标签 · ${valid.length} 台`
          : `标签管理 · ${valid[0]}`;
    }
    const hint = $("#node-labels-batch-hint");
    if (hint) {
      if (pendingNodeLabelsMode === "merge") {
        hint.textContent =
          "批量模式：以下标签将合并写入所选节点（同名 key 覆盖原值，其它已有标签保留）。请添加需要设置的标签。";
        hint.hidden = false;
      } else {
        hint.textContent = "";
        hint.hidden = true;
      }
    }
    renderNodeBatchTargetChips("#node-labels-batch-targets", pendingNodeLabelsMode === "merge" ? valid : []);
    const conf = $("#modal-node-labels-confirm");
    if (conf) conf.textContent = pendingNodeLabelsMode === "merge" ? "批量写入标签" : "保存标签";
    const err = $("#node-labels-error");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    const kIn = $("#node-label-key");
    const vIn = $("#node-label-value");
    if (kIn) kIn.value = "";
    if (vIn) vIn.value = "";
    setInputInvalid(kIn, false);
    setInputInvalid(vIn, false);
    renderNodeLabelsEditorUI();
    $("#modal-node-labels")?.classList.add("show");
  }

  function closeNodeLabelsEditor() {
    pendingNodeLabelsNames = null;
    pendingNodeLabelsMode = "replace";
    pendingNodeLabelsDraft = null;
    const hint = $("#node-labels-batch-hint");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    renderNodeBatchTargetChips("#node-labels-batch-targets", []);
    $("#modal-node-labels")?.classList.remove("show");
  }

  function applyLabelsToNode(n, draft, mode) {
    if (!n || !draft) return;
    let next;
    if (mode === "merge") {
      next = { ...nodeLabelsOf(n), ...draft };
    } else {
      next = { ...draft };
    }
    n.labels = next;
    n.dc = next["maip.io/datacenter"] || "";
    if (next["maip.io/ib-domain"]) n.ibDomain = next["maip.io/ib-domain"];
    if (next["maip.io/gpu-type"]) n.gpuType = next["maip.io/gpu-type"];
    if (next["maip.io/ib"] === "false") n.hasIB = false;
  }

  function addNodeLabelRow() {
    if (!pendingNodeLabelsDraft) return;
    const existing = Object.entries(collectNodeLabelsDraftFromUI());
    const { kEl, vEl, key, value } = pendingNodeLabelAddInput();
    const err = $("#node-labels-error");
    setInputInvalid(kEl, false);
    setInputInvalid(vEl, false);
    const keyErr = k8sQualifiedNameError(key, "标签 key");
    if (keyErr) {
      setInputInvalid(kEl, true);
      kEl?.focus();
      setNodeEditorError(err, keyErr);
      return;
    }
    const valErr = k8sLabelValueError(value, "标签 value");
    if (valErr) {
      setInputInvalid(vEl, true);
      vEl?.focus();
      setNodeEditorError(err, valErr);
      return;
    }
    if (existing.some(([k]) => k === key)) {
      setInputInvalid(kEl, true);
      kEl?.focus();
      setNodeEditorError(err, `标签 ${key} 已存在，请直接修改或先删除`);
      return;
    }
    // 新标签固定追加到列表末尾
    pendingNodeLabelsDraft = Object.fromEntries([...existing, [key, value]]);
    if (kEl) kEl.value = "";
    if (vEl) vEl.value = "";
    clearNodeEditorInvalid("#modal-node-labels", "#node-labels-error");
    renderNodeLabelsEditorUI({ scrollToEnd: true });
  }

  function submitNodeLabels() {
    const names = pendingNodeLabelsNames || [];
    if (!names.length || !pendingNodeLabelsDraft) {
      closeNodeLabelsEditor();
      return;
    }
    const err = $("#node-labels-error");
    const pendingAdd = pendingNodeLabelAddInput();
    if (pendingAdd.key || pendingAdd.value) {
      setInputInvalid(pendingAdd.kEl, true);
      pendingAdd.kEl?.focus();
      setNodeEditorError(err, "底部还有未添加的标签，请先点击「添加」或清空输入");
      return;
    }
    setInputInvalid(pendingAdd.kEl, false);
    setInputInvalid(pendingAdd.vEl, false);
    const rowErr = validateNodeLabelsDraftRows();
    if (rowErr) {
      setNodeEditorError(err, rowErr);
      return;
    }
    const draft = collectNodeLabelsDraftFromUI();
    const mode = pendingNodeLabelsMode || "replace";
    if (mode === "merge" && !Object.keys(draft).length) {
      setNodeEditorError(err, "请至少添加一个要批量写入的标签");
      return;
    }
    let ok = 0;
    names.forEach((name) => {
      const n = findNode(name);
      if (!n) return;
      const prev = nodeLabelsOf(n);
      applyLabelsToNode(n, draft, mode);
      const next = nodeLabelsOf(n);
      if (!labelsEqual(prev, next)) {
        const remarkDraft = mode === "merge" ? draft : next;
        recordNodeMaintOp({
          action: "labels",
          node: name,
          remark: summarizeLabelChange(prev, remarkDraft, mode),
        });
      }
      nodeMgmtSelected.delete(name);
      ok += 1;
    });
    const detailName = pendingNodeDetailName;
    closeNodeLabelsEditor();
    toast(
      mode === "merge"
        ? `已为 ${ok} 台节点合并写入标签`
        : `已更新节点标签：${names[0]}`
    );
    if ($("#page-node-mgmt")?.classList.contains("active")) renderNodeMgmt();
    if (detailName && names.includes(detailName)) openNodeDetail(detailName);
  }

  function renderNodeTaintsEditorUI() {
    const el = $("#node-taints-editor");
    if (!el || !pendingNodeTaintsDraft) return;
    el.innerHTML = pendingNodeTaintsDraft.length
      ? pendingNodeTaintsDraft
          .map((t, idx) => {
            const text = `${t.key}${t.value ? "=" + t.value : ""}:${t.effect}`;
            return `
        <div class="node-taint-row">
          <span class="k8s-taint-tag mono" title="${escapeHtml(text)}">${escapeHtml(text)}</span>
          <button type="button" class="btn btn-danger btn-sm" data-taint-del="${idx}" title="删除">删除</button>
        </div>`;
          })
          .join("")
      : `<div class="node-editor-empty">${
          pendingNodeTaintsMode === "merge"
            ? "批量写入列表为空，请在下方添加要合并的污点"
            : "当前节点无污点"
        }</div>`;

    $$("[data-taint-del]").forEach((b) =>
      b.addEventListener("click", () => {
        const idx = +b.dataset.taintDel;
        if (!Number.isNaN(idx) && pendingNodeTaintsDraft) {
          pendingNodeTaintsDraft.splice(idx, 1);
          renderNodeTaintsEditorUI();
        }
      })
    );
  }

  /** @param {string|string[]} nodeNameOrNames */
  function openNodeTaintsEditor(nodeNameOrNames) {
    const names = [...new Set((Array.isArray(nodeNameOrNames) ? nodeNameOrNames : [nodeNameOrNames]).filter(Boolean))];
    if (!names.length) {
      toast("请先选择节点", "warning");
      return;
    }
    const valid = names.filter((name) => findNode(name));
    if (!valid.length) {
      toast("未找到节点", "error");
      return;
    }
    pendingNodeTaintsNames = valid;
    pendingNodeTaintsMode = valid.length > 1 ? "merge" : "replace";
    pendingNodeTaintsDraft =
      pendingNodeTaintsMode === "replace" ? nodeTaintsOf(findNode(valid[0])) : [];
    const title = $("#modal-node-taints-title");
    if (title) {
      title.textContent =
        pendingNodeTaintsMode === "merge"
          ? `批量添加污点 · ${valid.length} 台`
          : `污点管理 · ${valid[0]}`;
    }
    const hint = $("#node-taints-batch-hint");
    if (hint) {
      if (pendingNodeTaintsMode === "merge") {
        hint.textContent =
          "批量模式：以下污点将合并添加到所选节点（相同 key + effect 覆盖，其它污点保留）。请添加需要写入的污点。";
        hint.hidden = false;
      } else {
        hint.textContent = "";
        hint.hidden = true;
      }
    }
    renderNodeBatchTargetChips("#node-taints-batch-targets", pendingNodeTaintsMode === "merge" ? valid : []);
    const conf = $("#modal-node-taints-confirm");
    if (conf) conf.textContent = pendingNodeTaintsMode === "merge" ? "批量写入污点" : "保存污点";
    const err = $("#node-taints-error");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    const tKey = $("#node-taint-key");
    const tVal = $("#node-taint-value");
    const tEff = $("#node-taint-effect");
    if (tKey) tKey.value = "";
    if (tVal) tVal.value = "";
    if (tEff) tEff.value = "NoSchedule";
    setInputInvalid(tKey, false);
    setInputInvalid(tVal, false);
    setInputInvalid(tEff, false);
    renderNodeTaintsEditorUI();
    $("#modal-node-taints")?.classList.add("show");
  }

  function closeNodeTaintsEditor() {
    pendingNodeTaintsNames = null;
    pendingNodeTaintsMode = "replace";
    pendingNodeTaintsDraft = null;
    const hint = $("#node-taints-batch-hint");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    renderNodeBatchTargetChips("#node-taints-batch-targets", []);
    $("#modal-node-taints")?.classList.remove("show");
  }

  function applyTaintsToNode(n, taints, mode) {
    if (!n || !Array.isArray(taints)) return;
    if (mode === "merge") {
      const cur = nodeTaintsOf(n);
      taints.forEach((t) => {
        const idx = cur.findIndex((x) => x.key === t.key && x.effect === t.effect);
        if (idx >= 0) cur[idx] = { ...t };
        else cur.push({ ...t });
      });
      n.taints = cur;
    } else {
      n.taints = taints.map((t) => ({ ...t }));
    }
  }

  function pendingNodeTaintAddInput() {
    return {
      kEl: $("#node-taint-key"),
      vEl: $("#node-taint-value"),
      eEl: $("#node-taint-effect"),
      key: ($("#node-taint-key")?.value || "").trim(),
      value: ($("#node-taint-value")?.value || "").trim(),
      effect: $("#node-taint-effect")?.value || "NoSchedule",
    };
  }

  function validateK8sTaintFields(key, value, effect) {
    return (
      k8sQualifiedNameError(key, "污点 key") ||
      k8sLabelValueError(value, "污点 value") ||
      k8sTaintEffectError(effect)
    );
  }

  function validateNodeTaintsDraft() {
    const seen = new Set();
    for (let i = 0; i < (pendingNodeTaintsDraft || []).length; i++) {
      const t = pendingNodeTaintsDraft[i];
      const key = String(t.key || "").trim();
      const value = String(t.value || "").trim();
      const effect = t.effect || "";
      const msg = validateK8sTaintFields(key, value, effect);
      if (msg) return `第 ${i + 1} 条：${msg}`;
      const sig = `${key}|${effect}`;
      if (seen.has(sig)) return `第 ${i + 1} 条：相同 key + effect 的污点重复`;
      seen.add(sig);
    }
    return "";
  }

  function addNodeTaintRow() {
    if (!pendingNodeTaintsDraft) return;
    const { kEl, vEl, eEl, key, value, effect } = pendingNodeTaintAddInput();
    const err = $("#node-taints-error");
    setInputInvalid(kEl, false);
    setInputInvalid(vEl, false);
    setInputInvalid(eEl, false);
    const keyErr = k8sQualifiedNameError(key, "污点 key");
    if (keyErr) {
      setInputInvalid(kEl, true);
      kEl?.focus();
      setNodeEditorError(err, keyErr);
      return;
    }
    const valErr = k8sLabelValueError(value, "污点 value");
    if (valErr) {
      setInputInvalid(vEl, true);
      vEl?.focus();
      setNodeEditorError(err, valErr);
      return;
    }
    const effectErr = k8sTaintEffectError(effect);
    if (effectErr) {
      setInputInvalid(eEl, true);
      eEl?.focus();
      setNodeEditorError(err, effectErr);
      return;
    }
    const exists = pendingNodeTaintsDraft.some((t) => t.key === key && t.effect === effect);
    if (exists) {
      setInputInvalid(kEl, true);
      setInputInvalid(eEl, true);
      kEl?.focus();
      setNodeEditorError(err, "相同 key + effect 的污点已存在");
      return;
    }
    pendingNodeTaintsDraft.push({ key, value, effect });
    if (kEl) kEl.value = "";
    if (vEl) vEl.value = "";
    clearNodeEditorInvalid("#modal-node-taints", "#node-taints-error");
    renderNodeTaintsEditorUI();
  }

  function submitNodeTaints() {
    const names = pendingNodeTaintsNames || [];
    if (!names.length || !pendingNodeTaintsDraft) {
      closeNodeTaintsEditor();
      return;
    }
    const mode = pendingNodeTaintsMode || "replace";
    const err = $("#node-taints-error");
    const pendingAdd = pendingNodeTaintAddInput();
    if (pendingAdd.key || pendingAdd.value) {
      setInputInvalid(pendingAdd.kEl, true);
      pendingAdd.kEl?.focus();
      setNodeEditorError(err, "底部还有未添加的污点，请先点击「添加」或清空输入");
      return;
    }
    setInputInvalid(pendingAdd.kEl, false);
    setInputInvalid(pendingAdd.vEl, false);
    setInputInvalid(pendingAdd.eEl, false);
    const draftErr = validateNodeTaintsDraft();
    if (draftErr) {
      setNodeEditorError(err, draftErr);
      return;
    }
    if (mode === "merge" && !pendingNodeTaintsDraft.length) {
      setNodeEditorError(err, "请至少添加一个要批量写入的污点");
      return;
    }
    const taints = pendingNodeTaintsDraft.map((t) => ({ ...t }));
    let ok = 0;
    names.forEach((name) => {
      const n = findNode(name);
      if (!n) return;
      const prev = nodeTaintsOf(n);
      applyTaintsToNode(n, taints, mode);
      const next = nodeTaintsOf(n);
      if (!taintsEqual(prev, next)) {
        recordNodeMaintOp({
          action: "taints",
          node: name,
          remark: summarizeTaintChange(prev, mode === "merge" ? taints : next, mode),
        });
      }
      nodeMgmtSelected.delete(name);
      ok += 1;
    });
    const detailName = pendingNodeDetailName;
    closeNodeTaintsEditor();
    toast(
      mode === "merge"
        ? `已为 ${ok} 台节点合并写入污点`
        : `已更新节点污点：${names[0]}`
    );
    if ($("#page-node-mgmt")?.classList.contains("active")) renderNodeMgmt();
    if (detailName && names.includes(detailName)) openNodeDetail(detailName);
  }

  /* ---------- 管理中心：队列 / 用户 / 团队 ---------- */
  function renderQueueMgmtList() {
    const body = $("#queue-mgmt-body");
    if (!body) return;
    let list = [...(MOCK.queues || [])];
    if (queueMgmtFilter.dc !== "all") list = list.filter((q) => q.dc === queueMgmtFilter.dc);
    if (queueMgmtFilter.gpuType && queueMgmtFilter.gpuType !== "all") {
      list = list.filter((q) => q.gpuType === queueMgmtFilter.gpuType);
    }
    if (queueMgmtFilter.status === "open") {
      list = list.filter((q) => isQueueEnabled(q));
    } else if (queueMgmtFilter.status === "closed") {
      list = list.filter((q) => !isQueueEnabled(q));
    }
    if (queueMgmtFilter.q) {
      const q = queueMgmtFilter.q.toLowerCase();
      list = list.filter(
        (x) =>
          (x.name || "").toLowerCase().includes(q) ||
          (x.displayName || "").toLowerCase().includes(q) ||
          (x.team || "").toLowerCase().includes(q) ||
          queueTeamNames(x).some((n) => n.toLowerCase().includes(q)) ||
          (x.desc || "").toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const pageSize = queueMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (queueMgmtFilter.page > totalPages) queueMgmtFilter.page = totalPages;
    if (queueMgmtFilter.page < 1) queueMgmtFilter.page = 1;
    const start = (queueMgmtFilter.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    body.innerHTML = pageList.length
      ? `<div class="table-wrap"><table class="table">
        <thead><tr>
          <th>队列</th><th>团队</th><th>数据中心</th><th>GPU</th><th>额度（已用 / 总量）</th>
          <th title="卡时 = GPU 数 × 运行时长，后续可用于训练任务成本核算">本月卡时</th>
          <th>功能特性</th><th>状态</th><th class="th-actions">操作</th>
        </tr></thead>
        <tbody>
          ${pageList
            .map((q) => {
              const enabled = isQueueEnabled(q);
              const monthHours = queueGpuHoursMonth(q);
              return `
            <tr class="${enabled ? "" : "is-disabled-row"}">
              <td>
                <strong>${q.displayName || q.name}</strong>
                <div class="mono text-muted" style="font-size:11px">${q.name}</div>
                ${q.desc ? `<div class="text-muted" style="font-size:11.5px;margin-top:2px">${escapeHtml(q.desc)}</div>` : ""}
              </td>
              <td class="td-queue-teams">${
                (() => {
                  const names = queueTeamNames(q);
                  if (!names.length) return '<span class="text-muted">—</span>';
                  return `<div class="queue-team-tags" title="${escapeHtml(names.join("、"))}">${names
                    .map((n) => `<span class="tag tag-soft">${escapeHtml(n)}</span>`)
                    .join("")}</div>`;
                })()
              }</td>
              <td>${dcBadge(q.dc)}</td>
              <td class="td-gpu-type"><span class="gpu-type-text" title="${escapeHtml(q.gpuType || "")}">${escapeHtml(q.gpuType || "—")}</span></td>
              <td class="td-queue-quota">${renderQueueQuotaMeters(q)}</td>
              <td class="td-queue-hours" title="本月累计 ${formatGpuHours(monthHours)}，后续可用于训练任务成本核算">
                <div class="queue-hours-line"><strong>${formatGpuHours(monthHours, { unit: false })}</strong> <span class="text-muted">卡时</span></div>
              </td>
              <td>${renderQueueFeatureTags(q)}</td>
              <td>${queueStateBadge(q)}</td>
              <td class="td-actions">
                <div class="job-actions job-actions-stack">
                  <div class="job-actions-row">
                    <button type="button" class="btn btn-ghost btn-sm" data-q-jobs="${q.name}">任务</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-q-edit="${q.id}">编辑</button>
                  </div>
                  <div class="job-actions-row">
                    ${
                      enabled
                        ? `<button type="button" class="btn btn-secondary btn-sm" data-q-disable="${q.id}">禁用</button>`
                        : `<button type="button" class="btn btn-primary btn-sm" data-q-enable="${q.id}">启用</button>`
                    }
                    <button type="button" class="btn btn-danger btn-sm" data-q-delete="${q.id}">删除</button>
                  </div>
                </div>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>
      ${renderPager({
        total,
        page: queueMgmtFilter.page,
        pageSize,
        key: "queue-mgmt",
      })}`
      : `<div class="empty-state">没有匹配的队列</div>`;

    $$("[data-q-jobs]").forEach((b) =>
      b.addEventListener("click", () => {
        const q = findQueue(b.dataset.qJobs);
        jobListState.queueId = q?.id || b.dataset.qJobs || "all";
        jobListState.teamId = "all";
        jobListState.page = 1;
        navigate("jobs");
        toast(`已按队列筛选: ${q?.displayName || b.dataset.qJobs}`);
      })
    );
    $$("[data-q-edit]").forEach((b) =>
      b.addEventListener("click", () => {
        openQueueForm(b.dataset.qEdit);
      })
    );
    $$("[data-q-disable]").forEach((b) =>
      b.addEventListener("click", () => openQueueActionConfirm("disable", b.dataset.qDisable))
    );
    $$("[data-q-enable]").forEach((b) =>
      b.addEventListener("click", () => openQueueActionConfirm("enable", b.dataset.qEnable))
    );
    $$("[data-q-delete]").forEach((b) =>
      b.addEventListener("click", () => openQueueActionConfirm("delete", b.dataset.qDelete))
    );
    bindPager(
      "queue-mgmt",
      () => ({ page: queueMgmtFilter.page, pageSize: queueMgmtFilter.pageSize, total }),
      (p) => {
        queueMgmtFilter.page = p;
      },
      (s) => {
        queueMgmtFilter.pageSize = s;
      },
      renderQueueMgmtList
    );
  }

  /** 队列启用 / 禁用 / 删除二次确认；blocked 表示因活跃任务禁止删除 */
  let pendingQueueAction = null; // { action: enable|disable|delete|blocked, queueId }

  function fillQueueActionMeta(q) {
    const metaEl = $("#modal-queue-action-meta");
    if (!metaEl) return;
    // 展示名已含团队 / 数据中心 / 卡型号，这里只补队列标识
    const parts = [q.name].filter(Boolean);
    if (q.volcanoQueue && q.volcanoQueue !== q.name) parts.push(q.volcanoQueue);
    metaEl.textContent = parts.join(" · ");
  }

  function setQueueActionFooter({ confirmHidden, confirmCls, confirmText, cancelText }) {
    const confirmBtn = $("#modal-queue-action-confirm");
    const cancelBtn = $("#modal-queue-action-cancel");
    if (confirmBtn) {
      if (confirmCls) confirmBtn.className = confirmCls;
      confirmBtn.classList.toggle("hidden", !!confirmHidden);
      confirmBtn.hidden = !!confirmHidden;
      if (confirmText) confirmBtn.textContent = confirmText;
    }
    if (cancelBtn) cancelBtn.textContent = cancelText || "取消";
  }

  /** 禁用队列确认提示：运行中不受影响，排队中需手动终止 */
  function queueDisableHint(q) {
    const counts = queueActiveJobCounts(q?.id);
    const runningBit =
      counts.running > 0
        ? `已在运行的 ${counts.running} 个任务不受影响`
        : "已在运行的任务不受影响";
    const queuedBit =
      counts.queued > 0
        ? `排队中的 ${counts.queued} 个任务将无法被调度，需手动终止`
        : "排队中的任务将无法被调度，需手动终止";
    return `禁用后，新建任务将不可再选择该队列。${runningBit}；${queuedBit}。可随时重新启用。`;
  }

  function queueActiveJobPhrase(counts) {
    const bits = [];
    if (counts?.running) bits.push(`${counts.running} 个运行中`);
    if (counts?.queued) bits.push(`${counts.queued} 个排队中`);
    return bits.join("、") || `${counts?.total || 0} 个`;
  }

  /** 有运行 / 排队任务时禁止删除，仅展示原因 */
  function openQueueDeleteBlocked(q, counts) {
    pendingQueueAction = { action: "blocked", queueId: q.id };
    const name = q.displayName || q.name;
    const titleEl = $("#modal-queue-action-title");
    const msgEl = $("#modal-queue-action-msg");
    const hintEl = $("#modal-queue-action-hint");
    if (titleEl) titleEl.textContent = "无法删除队列";
    if (msgEl) {
      msgEl.innerHTML = `队列 <strong>${escapeHtml(name)}</strong> 仍有 ${queueActiveJobPhrase(counts)}的任务，暂不可删除。`;
    }
    fillQueueActionMeta(q);
    if (hintEl) {
      setConfirmHint(hintEl, "请等待任务结束，或先停止相关任务后再删除。", "delete");
    }
    setQueueActionFooter({
      confirmHidden: true,
      confirmCls: "btn btn-danger",
      confirmText: "确认删除",
      cancelText: "知道了",
    });
    $("#modal-queue-action")?.classList.add("show");
  }

  function openQueueActionConfirm(action, queueId) {
    const q = findQueue(queueId);
    if (!q) {
      toast("未找到队列", "error");
      return;
    }
    const enabled = isQueueEnabled(q);
    if (action === "disable" && !enabled) {
      toast("该队列已是禁用状态", "info");
      return;
    }
    if (action === "enable" && enabled) {
      toast("该队列已是启用状态", "info");
      return;
    }

    if (action === "delete") {
      const counts = queueActiveJobCounts(q.id);
      if (counts.total > 0) {
        openQueueDeleteBlocked(q, counts);
        return;
      }
    }

    pendingQueueAction = { action, queueId: q.id };
    const name = q.displayName || q.name;
    const titleMap = {
      disable: "确认禁用队列",
      enable: "确认启用队列",
      delete: "确认删除队列",
    };
    const msgMap = {
      disable: `确定要禁用队列 <strong>${escapeHtml(name)}</strong> 吗？`,
      enable: `确定要启用队列 <strong>${escapeHtml(name)}</strong> 吗？`,
      delete: `确定要删除队列 <strong>${escapeHtml(name)}</strong> 吗？`,
    };
    const hintMap = {
      disable: queueDisableHint(q),
      enable: "启用后，该队列将重新出现在新建任务的队列选择列表中，团队成员可再次提交任务。",
      delete: "团队关联将解除。已结束任务的历史记录会保留。此操作不可撤销。",
    };
    const confirmCls = action === "enable" ? "btn btn-primary" : "btn btn-danger";
    const confirmText = action === "enable" ? "确认启用" : action === "delete" ? "确认删除" : "确认禁用";

    const titleEl = $("#modal-queue-action-title");
    const msgEl = $("#modal-queue-action-msg");
    const hintEl = $("#modal-queue-action-hint");
    if (titleEl) titleEl.textContent = titleMap[action] || "确认操作";
    if (msgEl) msgEl.innerHTML = msgMap[action] || "";
    fillQueueActionMeta(q);
    if (hintEl) setConfirmHint(hintEl, hintMap[action] || "", action);
    setQueueActionFooter({
      confirmHidden: false,
      confirmCls,
      confirmText,
      cancelText: "取消",
    });
    $("#modal-queue-action")?.classList.add("show");
  }

  function closeQueueActionConfirm() {
    pendingQueueAction = null;
    setQueueActionFooter({
      confirmHidden: false,
      confirmCls: "btn btn-danger",
      confirmText: "确认",
      cancelText: "取消",
    });
    $("#modal-queue-action")?.classList.remove("show");
  }

  function confirmQueueAction() {
    const pending = pendingQueueAction;
    if (!pending || pending.action === "blocked") {
      closeQueueActionConfirm();
      return;
    }
    const q = findQueue(pending.queueId);
    if (!q) {
      closeQueueActionConfirm();
      toast("未找到队列", "error");
      return;
    }

    if (pending.action === "disable") {
      const queued = queueActiveJobCounts(q.id).queued;
      q.state = "Closed";
      closeQueueActionConfirm();
      toast(
        queued > 0
          ? `已禁用队列「${q.displayName || q.name}」，新任务将不可选择该队列。排队中 ${queued} 个任务需手动终止`
          : `已禁用队列「${q.displayName || q.name}」，新任务将不可选择该队列`,
        "warning"
      );
      renderQueueMgmtList();
      return;
    }
    if (pending.action === "enable") {
      q.state = "Open";
      closeQueueActionConfirm();
      toast(`已启用队列「${q.displayName || q.name}」，可再次用于提交任务`);
      renderQueueMgmtList();
      return;
    }
    if (pending.action === "delete") {
      const counts = queueActiveJobCounts(q.id);
      if (counts.total > 0) {
        openQueueDeleteBlocked(q, counts);
        toast("该队列仍有运行或排队中的任务，无法删除", "warning");
        return;
      }
      const id = q.id;
      const label = q.displayName || q.name;
      (MOCK.teams || []).forEach((t) => {
        t.queueIds = (t.queueIds || []).filter((qid) => qid !== id);
      });
      MOCK.queues = (MOCK.queues || []).filter((x) => x.id !== id);
      if (jobListState.queueId === id || jobListState.queueId === q.name) {
        jobListState.queueId = "all";
      }
      if (CREATE_DEFAULTS.queueId === id) {
        CREATE_DEFAULTS.queueId = MOCK.queues[0]?.id || "";
      }
      closeQueueActionConfirm();
      toast(`已删除队列「${label}」`, "warning");
      renderQueueMgmt();
    }
  }

  function renderQueueMgmt() {
    const dcSel = $("#queue-filter-dc");
    if (dcSel) {
      const cur = queueMgmtFilter.dc || "all";
      dcSel.innerHTML =
        `<option value="all">全部数据中心</option>` +
        (MOCK.datacenters || [])
          .map(
            (d) =>
              `<option value="${d.id}" ${cur === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`
          )
          .join("");
      if (!dcSel.dataset.bound) {
        dcSel.dataset.bound = "1";
        dcSel.addEventListener("change", () => {
          queueMgmtFilter.dc = dcSel.value;
          queueMgmtFilter.page = 1;
          renderQueueMgmtList();
        });
      }
      dcSel.value = cur;
    }

    const gpuSel = $("#queue-filter-gpu");
    if (gpuSel) {
      const types = [
        ...new Set(
          [
            ...(MOCK.queues || []).map((q) => q.gpuType).filter(Boolean),
            ...(MOCK.clusterCapacity || []).map((c) => c.gpuType).filter(Boolean),
            "H100-80G",
            "H200-141G",
            "B300",
          ]
        ),
      ].sort((a, b) => String(a).localeCompare(String(b)));
      const prev = queueMgmtFilter.gpuType || "all";
      gpuSel.innerHTML =
        `<option value="all">全部卡型号</option>` +
        types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
      if (!gpuSel.dataset.bound) {
        gpuSel.dataset.bound = "1";
        gpuSel.addEventListener("change", () => {
          queueMgmtFilter.gpuType = gpuSel.value || "all";
          queueMgmtFilter.page = 1;
          renderQueueMgmtList();
        });
      }
      gpuSel.value = types.includes(prev) || prev === "all" ? prev : "all";
      if (gpuSel.value !== prev) queueMgmtFilter.gpuType = gpuSel.value;
    }

    const statusSel = $("#queue-filter-status");
    if (statusSel) {
      const cur = queueMgmtFilter.status || "all";
      if (!statusSel.dataset.bound) {
        statusSel.dataset.bound = "1";
        statusSel.addEventListener("change", () => {
          queueMgmtFilter.status = statusSel.value || "all";
          queueMgmtFilter.page = 1;
          renderQueueMgmtList();
        });
      }
      statusSel.value = cur === "open" || cur === "closed" ? cur : "all";
      if (statusSel.value !== cur) queueMgmtFilter.status = statusSel.value;
    }

    const search = $("#queue-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", () => {
        queueMgmtFilter.q = search.value || "";
        queueMgmtFilter.page = 1;
        renderQueueMgmtList();
      });
    }

    renderQueueMgmtList();
  }

  /**
   * 队列功能特性定义（当前：IB；可按需扩展）
   * filterKey：对应 clusterCapacity 上的布尔字段，用于 GPU 型号前置过滤
   */
  const QUEUE_FEATURE_DEFS = [
    {
      id: "ib",
      label: "IB",
      title: "支持 IB",
      filterKey: "hasIB",
      tagClass: "is-ib",
    },
  ];

  /** 队列功能特性标签（列表展示） */
  function renderQueueFeatureTags(q) {
    const feats = normalizeQueueFeatures(q);
    if (!feats.length) return `<span class="text-muted">—</span>`;
    return feats
      .map((f) => {
        const def = QUEUE_FEATURE_DEFS.find((d) => d.id === f);
        const text = def?.label || f;
        if (f === "ib") {
          return `<span class="tag queue-feat-tag is-ib" style="background:var(--info-soft);color:var(--info)">${escapeHtml(text)}</span>`;
        }
        return `<span class="tag queue-feat-tag">${escapeHtml(text)}</span>`;
      })
      .join(" ");
  }

  /**
   * 队列功能特性规范化（与队列管理一致）
   * - features 数组为权威来源
   * - 无 features 时回退 requireIB（兼容旧数据）
   * - 同步 requireIB，避免两处字段不一致
   */
  function normalizeQueueFeatures(q) {
    if (!q) return [];
    let feats;
    if (Array.isArray(q.features)) {
      feats = q.features.filter(Boolean).slice();
    } else {
      feats = q.requireIB ? ["ib"] : [];
    }
    const hasIb = feats.includes("ib");
    // 保持 requireIB 与 features 一致，避免创建任务页误判
    q.requireIB = hasIb;
    if (!Array.isArray(q.features)) q.features = feats.slice();
    return feats;
  }

  function queueHasFeature(q, feat) {
    return normalizeQueueFeatures(q).includes(feat);
  }

  /** 队列是否具备「支持 IB」特性（与队列管理列表展示一致） */
  function queueSupportsIB(q) {
    return queueHasFeature(q, "ib");
  }

  function readQueueFormFeatures() {
    return $$("#q-form-features input[data-feature]:checked")
      .map((el) => el.dataset.feature || el.value)
      .filter(Boolean);
  }

  function setQueueFormFeatures(features) {
    const set = new Set(features || []);
    $$("#q-form-features input[data-feature]").forEach((el) => {
      const id = el.dataset.feature || el.value;
      el.checked = set.has(id);
    });
    syncQueueFeatureFilterUi();
  }

  /** 同步功能特性复选框选中态 */
  function syncQueueFeatureFilterUi() {
    $$("#q-form-features .queue-feature-option").forEach((lab) => {
      const on = !!lab.querySelector('input[type="checkbox"]')?.checked;
      lab.classList.toggle("is-selected", on);
    });
  }

  /**
   * 按数据中心 + 已选功能特性过滤可用 GPU 型号
   * 多特性为 AND（当前仅 IB）
   * @returns {{ gpuType: string, hasIB: boolean, total: number }[]}
   */
  function listQueueFormGpuOptions(dc, features) {
    if (!dc) return [];
    const feats = features || [];
    let caps = (MOCK.clusterCapacity || []).filter((c) => c.dc === dc);
    feats.forEach((fid) => {
      const def = QUEUE_FEATURE_DEFS.find((d) => d.id === fid);
      if (!def?.filterKey) return;
      caps = caps.filter((c) => !!c[def.filterKey]);
    });
    const map = new Map();
    caps.forEach((c) => {
      const key = c.gpuType || "";
      if (!key) return;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          gpuType: key,
          hasIB: !!c.hasIB,
          total: c.total || 0,
        });
      } else {
        prev.total += c.total || 0;
        prev.hasIB = prev.hasIB || !!c.hasIB;
      }
    });
    return [...map.values()].sort((a, b) => a.gpuType.localeCompare(b.gpuType));
  }

  function formatQueueGpuOptionLabel(o) {
    return o.hasIB ? `${o.gpuType} · IB` : o.gpuType;
  }

  /** 刷新 GPU 型号下拉（随数据中心 / 功能特性筛选变化） */
  function refreshQueueFormGpuOptions(preferredGpu) {
    const sel = $("#q-form-gpu");
    const hint = $("#q-form-gpu-hint");
    if (!sel) return;
    const dc = $("#q-form-dc")?.value || "";
    const features = readQueueFormFeatures();
    const opts = listQueueFormGpuOptions(dc, features);
    const keep = preferredGpu || sel.value || "";
    const featLabels = features
      .map((id) => QUEUE_FEATURE_DEFS.find((d) => d.id === id)?.label || id)
      .filter(Boolean);

    if (!opts.length) {
      sel.innerHTML = `<option value="">暂无匹配型号</option>`;
      sel.value = "";
      sel.disabled = true;
      if (hint) {
        hint.textContent = features.length
          ? `当前数据中心没有同时满足「${featLabels.join(" + ")}」的 GPU 型号，请调整数据中心或功能特性。`
          : "当前数据中心暂无可用 GPU 型号。";
        hint.classList.add("is-warn");
      }
      return;
    }

    sel.disabled = false;
    sel.innerHTML = opts
      .map(
        (o) =>
          `<option value="${escapeHtml(o.gpuType)}">${escapeHtml(formatQueueGpuOptionLabel(o))}</option>`
      )
      .join("");
    if (keep && opts.some((o) => o.gpuType === keep)) {
      sel.value = keep;
    } else {
      sel.value = opts[0].gpuType;
    }
    if (hint) {
      hint.textContent = features.length
        ? `已按功能特性「${featLabels.join(" + ")}」筛选，共 ${opts.length} 种型号`
        : `未选功能特性，展示该数据中心全部型号，共 ${opts.length} 种`;
      hint.classList.remove("is-warn");
    }
  }

  function onQueueFormResourceFilterChange() {
    syncQueueFeatureFilterUi();
    refreshQueueFormGpuOptions();
    updateQueueFormCapacityHint();
  }

  function selectedQueueFormTeams() {
    return queueFormTeamIds.map(findTeam).filter(Boolean);
  }

  function renderQueueTeamSelection() {
    const box = $("#q-team-selected");
    const search = $("#q-form-team-search");
    const teams = selectedQueueFormTeams();
    if (search) {
      search.readOnly = false;
      search.classList.remove("is-locked");
    }
    if (!box) return;
    if (!teams.length) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    box.classList.remove("hidden");
    box.innerHTML = teams
      .map(
        (t) => `
      <span class="queue-team-chip">
        <span class="queue-team-chip-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
        <button type="button" class="queue-team-chip-remove" data-remove-q-team="${escapeHtml(t.id)}" aria-label="移除 ${escapeHtml(t.name)}">×</button>
      </span>`
      )
      .join("");
    $$("[data-remove-q-team]", box).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeQueueFormTeam(btn.dataset.removeQTeam);
      });
    });
  }

  function addQueueFormTeam(team) {
    if (!team?.id) return;
    if (!queueFormTeamIds.includes(team.id)) queueFormTeamIds.push(team.id);
    const search = $("#q-form-team-search");
    if (search) search.value = "";
    renderQueueTeamSelection();
    $("#q-team-results")?.classList.add("hidden");
    $("#q-form-error")?.classList.add("hidden");
    search?.blur();
  }

  function removeQueueFormTeam(teamId) {
    queueFormTeamIds = queueFormTeamIds.filter((id) => id !== teamId);
    renderQueueTeamSelection();
    if (!$("#q-team-results")?.classList.contains("hidden")) {
      renderQueueTeamResults($("#q-form-team-search")?.value || "");
    }
  }

  function clearQueueFormTeams() {
    queueFormTeamIds = [];
    const search = $("#q-form-team-search");
    if (search) search.value = "";
    renderQueueTeamSelection();
    $("#q-team-results")?.classList.add("hidden");
  }

  function renderQueueTeamResults(q) {
    const box = $("#q-team-results");
    if (!box) return;
    const ql = (q || "").trim().toLowerCase();
    const selected = new Set(queueFormTeamIds);
    let list = (MOCK.teams || []).filter((t) => t.status !== "disabled" && !selected.has(t.id));
    if (ql) {
      list = list.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(ql) ||
          (t.desc || "").toLowerCase().includes(ql) ||
          (t.owner || "").toLowerCase().includes(ql) ||
          (t.id || "").toLowerCase().includes(ql)
      );
    }
    list = list.slice(0, 30);
    if (!list.length) {
      const allSelected = (MOCK.teams || []).filter((t) => t.status !== "disabled").every((t) => selected.has(t.id));
      box.innerHTML = `<div class="user-picker-empty">${
        allSelected ? "已添加全部可用团队" : "无匹配团队，请先在「团队管理」中创建"
      }</div>`;
      box.classList.remove("hidden");
      return;
    }
    box.innerHTML = list
      .map(
        (t) => `
      <button type="button" class="user-picker-item" data-q-team-id="${escapeHtml(t.id)}" role="option">
        <span class="user-picker-item-avatar">${escapeHtml((t.name || "?").slice(0, 1))}</span>
        <span class="user-picker-item-body">
          <span class="user-picker-item-line">
            <strong>${escapeHtml(t.name)}</strong>
            <span class="text-muted">${(t.queueIds || []).length} 队列 · ${(t.members || []).length} 成员</span>
          </span>
          <span class="user-picker-item-sub text-muted">${escapeHtml(t.desc || "—")}${t.owner ? ` · 负责人 ${escapeHtml(t.owner)}` : ""}</span>
        </span>
      </button>`
      )
      .join("");
    box.classList.remove("hidden");
    if (box.dataset.boundPick !== "1") {
      box.dataset.boundPick = "1";
      box.addEventListener("mousedown", (e) => e.preventDefault());
      box.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-q-team-id]");
        if (!btn || !box.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        const team = (MOCK.teams || []).find((x) => x.id === btn.dataset.qTeamId);
        if (team) addQueueFormTeam(team);
      });
    }
  }

  function openQueueForm(editId) {
    const q = editId ? findQueue(editId) : null;
    $("#modal-queue-title").textContent = q ? "编辑队列" : "新建队列";
    $("#modal-queue-confirm").textContent = q ? "保存" : "创建队列";
    const dcSel = $("#q-form-dc");
    if (dcSel) {
      const dcs = MOCK.datacenters || [];
      dcSel.innerHTML = dcs.length
        ? dcs
            .map(
              (d) =>
                `<option value="${d.id}">${escapeHtml(d.name)}（${escapeHtml(d.id)}）</option>`
            )
            .join("")
        : `<option value="">请先创建数据中心</option>`;
    }
    const nameEl = $("#q-form-name");
    if (nameEl) {
      nameEl.value = q?.name || "";
      nameEl.disabled = Boolean(q);
    }
    setQueueNameFieldError("");
    syncFieldLockHint($("#q-form-name"), Boolean(q), "创建后不可改");
    $("#q-form-display").value = q?.displayName || "";
    if (dcSel) {
      // 新建时优先选有资源池的数据中心，避免落在无 capacity 的 default
      let preferred = q?.dc || "";
      if (!preferred) {
        const capDcs = new Set((MOCK.clusterCapacity || []).map((c) => c.dc));
        const firstWithCap = (MOCK.datacenters || []).find((d) => capDcs.has(d.id));
        preferred = firstWithCap?.id || "";
      }
      if ([...dcSel.options].some((o) => o.value === preferred)) {
        dcSel.value = preferred;
      } else if (dcSel.options.length) {
        dcSel.selectedIndex = 0;
      }
    }
    $("#q-form-gpu-quota").value = q?.gpuQuota ?? 32;
    $("#q-form-cpu").value = q?.cpuQuota ?? 512;
    $("#q-form-mem").value = q?.memQuotaGi ?? 4096;
    queueFormTeamIds = q ? queueTeamIdsOf(q) : [];
    renderQueueTeamSelection();
    $("#q-team-results")?.classList.add("hidden");
    // 功能特性：编辑回填；新建默认不选（展示全部型号）
    setQueueFormFeatures(q ? normalizeQueueFeatures(q) : []);
    // GPU 型号：按 DC + 功能特性过滤后再回填
    refreshQueueFormGpuOptions(q?.gpuType || "");
    $("#q-form-desc").value = q?.desc || "";
    $("#q-form-error")?.classList.add("hidden");
    $("#modal-queue").dataset.editId = q?.id || "";
    updateQueueFormCapacityHint();
    $("#modal-queue")?.classList.add("show");
    setTimeout(() => {
      if (!q) $("#q-form-name")?.focus();
    }, 40);
  }

  function updateQueueFormCapacityHint() {
    const hint = $("#q-form-capacity-hint");
    if (!hint) return;
    const dc = $("#q-form-dc")?.value;
    if (!dc) {
      hint.innerHTML = "";
      return;
    }

    const features = readQueueFormFeatures();
    const featLabels = features
      .map((id) => QUEUE_FEATURE_DEFS.find((d) => d.id === id)?.label || id)
      .filter(Boolean);
    // 随数据中心 + 功能特性筛选：展示匹配条件下各 GPU 型号分配情况
    let caps = (MOCK.clusterCapacity || []).filter((c) => c.dc === dc);
    features.forEach((fid) => {
      const def = QUEUE_FEATURE_DEFS.find((d) => d.id === fid);
      if (!def?.filterKey) return;
      caps = caps.filter((c) => !!c[def.filterKey]);
    });

    if (!caps.length) {
      hint.innerHTML = `
        <div class="queue-capacity-panel is-empty">
          <div class="queue-capacity-panel-title">资源分配预览 · ${escapeHtml(dcName(dc))}</div>
          <div class="text-warning" style="font-size:12.5px">${
            features.length
              ? `当前筛选条件下无匹配「${escapeHtml(featLabels.join(" + "))}」的资源池，请调整数据中心或功能特性。`
              : "该数据中心暂无可用资源池（原型数据）。"
          }</div>
        </div>`;
      return;
    }

    const editId = $("#modal-queue")?.dataset.editId || "";
    const selectedGpu = $("#q-form-gpu")?.value || "";
    const gpuTypes = new Set(caps.map((c) => c.gpuType));
    const peerQueues = (MOCK.queues || []).filter(
      (q) => q.dc === dc && gpuTypes.has(q.gpuType) && q.id !== editId
    );
    const rows = caps
      .slice()
      .sort((a, b) => String(a.gpuType).localeCompare(String(b.gpuType)))
      .map((cap) => {
        const gpuAllocated = peerQueues
          .filter((q) => q.gpuType === cap.gpuType)
          .reduce((s, q) => s + (q.gpuQuota || 0), 0);
        const isActive = selectedGpu && cap.gpuType === selectedGpu;
        const featTags = cap.hasIB
          ? '<span class="queue-cap-feat-tag is-ib">IB</span>'
          : '<span class="queue-cap-feat-tag is-muted">无 IB</span>';
        return `
          <div class="queue-capacity-gpu-row ${isActive ? "is-active" : ""}">
            <div class="queue-capacity-gpu-head">
              <span class="queue-capacity-gpu-name">
                ${escapeHtml(cap.gpuType)}
                ${featTags}
              </span>
            </div>
            ${renderAllocMeter({ label: "GPU", total: cap.total || 0, allocated: gpuAllocated, unit: "卡" })}
          </div>`;
      })
      .join("");

    const cpuTotal = caps.reduce((s, c) => s + (c.cpuTotal || 0), 0);
    const memTotal = caps.reduce((s, c) => s + (c.memTotalGi || 0), 0);
    const cpuAllocated = peerQueues.reduce((s, q) => s + (q.cpuQuota || 0), 0);
    const memAllocated = peerQueues.reduce((s, q) => s + (q.memQuotaGi || 0), 0);
    const memUnit = memUnitFor([memTotal, memAllocated, Math.max(0, memTotal - memAllocated)]);

    const titleSuffix = featLabels.length ? ` · ${featLabels.join(" + ")}` : "";
    hint.innerHTML = `
      <div class="queue-capacity-panel">
        <div class="queue-capacity-panel-head">
          <div class="queue-capacity-panel-title-row">
            <div class="queue-capacity-panel-title">资源分配预览 · ${escapeHtml(dcName(dc))}${escapeHtml(titleSuffix)}</div>
            <div class="queue-capacity-panel-meta text-muted">${caps.length} 种卡型号</div>
          </div>
          <div class="queue-capacity-panel-caption">卡型号为各型号 GPU 资源池；CPU / 内存为当前筛选条件下的合计。已分配为各队列额度之和（不含当前队列）</div>
        </div>
        <div class="queue-capacity-section-label">卡型号</div>
        <div class="queue-capacity-gpu-list">
          ${rows}
        </div>
        <div class="queue-capacity-section-label">CPU / 内存</div>
        <div class="queue-capacity-cpumem">
          ${renderAllocMeter({ label: "CPU", total: cpuTotal, allocated: cpuAllocated, unit: "核" })}
          ${renderAllocMeter({
            label: "内存",
            total: memTotal,
            allocated: memAllocated,
            formatValue: (n) => formatMemAmountWithUnit(n, memUnit),
          })}
        </div>
      </div>`;
  }

  function closeQueueForm() {
    $("#modal-queue")?.classList.remove("show");
    clearQueueFormTeams();
  }

  function submitQueueForm() {
    const editId = $("#modal-queue")?.dataset.editId || "";
    const name = $("#q-form-name")?.value?.trim();
    const displayName = $("#q-form-display")?.value?.trim();
    const dc = $("#q-form-dc")?.value;
    const gpuType = $("#q-form-gpu")?.value;
    const gpuQuota = +($("#q-form-gpu-quota")?.value || 0);
    const teamIds = [...queueFormTeamIds];
    const features = readQueueFormFeatures();
    const requireIB = features.includes("ib");
    const err = $("#q-form-error");
    if (!name || !displayName || !dc || !gpuQuota) {
      if (err) {
        err.textContent = "请填写队列标识、显示名称、数据中心与 GPU 额度";
        err.classList.remove("hidden");
      }
      return;
    }
    if (!editId) {
      const nameErr = k8sDns1123SubdomainError(name, "队列标识");
      if (nameErr) {
        setQueueNameFieldError(nameErr);
        $("#q-form-name")?.focus();
        return;
      }
      if ((MOCK.queues || []).some((q) => q.name === name)) {
        setQueueNameFieldError("队列标识已存在");
        $("#q-form-name")?.focus();
        return;
      }
      setQueueNameFieldError("");
    }
    if (!gpuType) {
      if (err) {
        err.textContent = "请选择可用的 GPU 型号（可调整数据中心或功能特性）";
        err.classList.remove("hidden");
      }
      return;
    }
    if (editId) {
      const q = findQueue(editId);
      if (q) {
        q.displayName = displayName;
        q.dc = dc;
        q.gpuType = gpuType;
        q.gpuQuota = gpuQuota;
        q.cpuQuota = +($("#q-form-cpu")?.value || 0);
        q.memQuotaGi = +($("#q-form-mem")?.value || 0);
        applyQueueTeams(q, teamIds);
        q.features = features;
        q.requireIB = requireIB;
        q.desc = $("#q-form-desc")?.value?.trim() || "";
        syncQueueTeamLinks(q.id, teamIds);
      }
      toast(`队列已更新: ${displayName}`);
    } else {
      const id = `q-${name.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
      MOCK.queues.push({
        id,
        name,
        displayName,
        team: teamIds.map((tid) => findTeam(tid)?.name).filter(Boolean).join("、"),
        teamId: teamIds[0] || "",
        teamIds: [...teamIds],
        dc,
        gpuType,
        gpuQuota,
        gpuUsed: 0,
        cpuQuota: +($("#q-form-cpu")?.value || 0),
        cpuUsed: 0,
        memQuotaGi: +($("#q-form-mem")?.value || 0),
        memUsedGi: 0,
        features,
        requireIB,
        volcanoQueue: name,
        weight: 5,
        reclaimable: true,
        state: "Open",
        pending: 0,
        desc: $("#q-form-desc")?.value?.trim() || "",
      });
      syncQueueTeamLinks(id, teamIds);
      toast(`队列已创建: ${displayName}（已映射 Volcano Queue）`);
    }
    closeQueueForm();
    renderQueueMgmt();
  }

  /** 按所选团队重写该队列的双向关联（支持多团队） */
  function syncQueueTeamLinks(queueId, teamIds) {
    if (!queueId) return;
    const keep = new Set((teamIds || []).filter(Boolean));
    (MOCK.teams || []).forEach((t) => {
      const has = (t.queueIds || []).includes(queueId);
      const should = keep.has(t.id);
      if (should && !has) {
        t.queueIds = [...(t.queueIds || []), queueId];
      } else if (!should && has) {
        t.queueIds = (t.queueIds || []).filter((id) => id !== queueId);
      }
    });
  }

  function isPlatformUser(username) {
    return (MOCK.ldapUsers || []).some((u) => u.username === username);
  }

  /** 用户管理：启用 / 停用 / 移除二次确认 */
  let pendingUserAction = null; // { action: enable|disable|remove, usernames: string[], skipped?: number, selfBlocked?: number }

  function findLdapUser(username) {
    return (MOCK.ldapUsers || []).find((x) => x.username === username);
  }

  function isCurrentLoginUser(u) {
    if (!u) return false;
    const me = MOCK.user || {};
    return (
      (!!me.username && u.username === me.username) || (!!me.name && u.name === me.name)
    );
  }

  function pruneUserMgmtSelection() {
    const alive = new Set((MOCK.ldapUsers || []).map((x) => x.username));
    userMgmtSelected = new Set([...userMgmtSelected].filter((un) => alive.has(un)));
  }

  function syncUserMgmtBatchBar() {
    const bar = $("#user-mgmt-batch-bar");
    const countEl = $("#user-mgmt-batch-count");
    const n = userMgmtSelected.size;
    if (countEl) countEl.textContent = `已选 ${n} 人`;
    if (bar) {
      if (n > 0) bar.removeAttribute("hidden");
      else bar.setAttribute("hidden", "");
    }
  }

  function filteredUserMgmtList() {
    let list = [...(MOCK.ldapUsers || [])];
    if (userMgmtFilter.status !== "all") list = list.filter((u) => u.status === userMgmtFilter.status);
    if (userMgmtFilter.roleId && userMgmtFilter.roleId !== "all") {
      list = list.filter((u) => (u.roleId || "role-algo") === userMgmtFilter.roleId);
    }
    if (userMgmtFilter.teamId && userMgmtFilter.teamId !== "all") {
      if (userMgmtFilter.teamId === "none") {
        list = list.filter((u) => userTeamIdsOf(u).length === 0);
      } else {
        list = list.filter((u) => userTeamIdsOf(u).includes(userMgmtFilter.teamId));
      }
    }
    if (userMgmtFilter.q) {
      const q = userMgmtFilter.q.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q) ||
          getRoleName(u.roleId || "role-algo").toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderUserActionTarget(users, action) {
    const el = $("#modal-user-action-target");
    if (!el) return;
    const list = users || [];
    const tone = action === "enable" ? "is-enable" : action === "remove" ? "is-remove" : "is-disable";
    el.className = `user-action-target ${tone}`;
    if (!list.length) {
      el.innerHTML = "";
      return;
    }
    const multi = list.length > 1;
    if (!multi) {
      const u = list[0];
      const roleId = u.roleId || "role-algo";
      const roleName = getRoleName(roleId);
      const roleBadgeClass = roleId === "role-sre" ? "badge-info" : "badge-healthy";
      const line1 = [u.username, u.email].filter(Boolean).join(" · ");
      const line2 = [u.department, u.title].filter(Boolean).join(" · ");
      el.innerHTML = `
        <div class="user-action-avatar" aria-hidden="true">${escapeHtml((u.name || u.username || "用").slice(0, 1))}</div>
        <div class="user-action-target-body">
          <div class="user-action-target-name">${escapeHtml(u.name || u.username || "—")}</div>
          <div class="user-action-target-line mono">${escapeHtml(line1 || "—")}</div>
          ${line2 ? `<div class="user-action-target-dept">${escapeHtml(line2)}</div>` : ""}
          <div class="user-action-target-tags">
            ${
              u.status === "active"
                ? '<span class="badge badge-healthy">启用</span>'
                : '<span class="badge badge-cancelled">停用</span>'
            }
            <span class="badge ${roleBadgeClass}">${escapeHtml(roleName)}</span>
          </div>
        </div>`;
      return;
    }
    const show = list.slice(0, 10);
    const more = list.length - show.length;
    el.innerHTML = `
      <div class="user-action-avatar is-count" aria-hidden="true">${list.length}</div>
      <div class="user-action-target-body">
        <div class="user-action-target-name">已选 ${list.length} 人</div>
        <div class="user-action-chips">
          ${show
            .map(
              (u) =>
                `<span class="user-action-chip">${escapeHtml(u.name || u.username)}<span class="mono">${escapeHtml(
                  u.username || ""
                )}</span></span>`
            )
            .join("")}
          ${more > 0 ? `<span class="text-muted" style="font-size:12px">+${more} 人</span>` : ""}
        </div>
      </div>`;
  }

  /**
   * @param {"enable"|"disable"|"remove"} action
   * @param {string|string[]} usernameOrUsernames
   */
  function openUserActionConfirm(action, usernameOrUsernames) {
    const usernames = [
      ...new Set((Array.isArray(usernameOrUsernames) ? usernameOrUsernames : [usernameOrUsernames]).filter(Boolean)),
    ];
    if (!usernames.length) {
      toast("请先选择用户", "warning");
      return;
    }
    const users = usernames.map(findLdapUser).filter(Boolean);
    if (!users.length) {
      toast("未找到用户", "error");
      return;
    }

    const selfBlocked = [];
    const skipped = [];
    const applicable = [];
    users.forEach((u) => {
      if (action === "remove" && isCurrentLoginUser(u)) {
        selfBlocked.push(u);
        return;
      }
      if (action === "enable" && u.status === "active") {
        skipped.push(u);
        return;
      }
      if (action === "disable" && u.status !== "active") {
        skipped.push(u);
        return;
      }
      applicable.push(u);
    });

    if (!applicable.length) {
      if (action === "remove" && selfBlocked.length) {
        toast("不能移除当前登录用户", "error");
        return;
      }
      const emptyMsg = {
        enable: "所选用户均已启用，无需再次启用",
        disable: "所选用户均已停用，无需再次停用",
        remove: "没有可移除的用户",
      };
      toast(emptyMsg[action] || "没有可操作的用户", "warning");
      return;
    }

    pendingUserAction = {
      action,
      usernames: applicable.map((u) => u.username),
      skipped: skipped.length,
      selfBlocked: selfBlocked.length,
    };
    const multi = applicable.length > 1;
    const first = applicable[0];
    const titleMap = {
      disable: multi ? "确认批量停用" : "确认停用用户",
      enable: multi ? "确认批量启用" : "确认启用用户",
      remove: multi ? "确认批量移除" : "确认移除用户",
    };
    const msgMap = {
      disable: multi
        ? `确定要停用选中的 <strong>${applicable.length}</strong> 名用户吗？`
        : `确定要停用用户 <strong>${escapeHtml(first.name)}</strong> 吗？`,
      enable: multi
        ? `确定要启用选中的 <strong>${applicable.length}</strong> 名用户吗？`
        : `确定要启用用户 <strong>${escapeHtml(first.name)}</strong> 吗？`,
      remove: multi
        ? `确定要从平台移除选中的 <strong>${applicable.length}</strong> 名用户吗？`
        : `确定要从平台移除用户 <strong>${escapeHtml(first.name)}</strong> 吗？`,
    };
    const hintMap = {
      disable: "停用后用户将无法登录训练平台，已加入的团队关系会保留。可随时重新启用。",
      enable: "启用后用户可使用 LDAP 账号登录，并继续使用已授权的团队与队列资源。",
      remove: "移除后用户将从平台可用列表删除，并同步移出各团队成员；历史任务记录仍会保留。此操作可再次从 LDAP 添加。",
    };
    const confirmCls = action === "enable" ? "btn btn-primary" : "btn btn-danger";
    const confirmText = action === "enable"
      ? multi
        ? `确认启用 ${applicable.length} 人`
        : "确认启用"
      : action === "disable"
      ? multi
        ? `确认停用 ${applicable.length} 人`
        : "确认停用"
      : multi
      ? `确认移除 ${applicable.length} 人`
      : "确认移除";

    const skipBits = [];
    if (skipped.length) skipBits.push(`已跳过 ${skipped.length} 名状态无需变更的用户`);
    if (selfBlocked.length) skipBits.push("已跳过当前登录用户");

    const titleEl = $("#modal-user-action-title");
    const msgEl = $("#modal-user-action-msg");
    const skipEl = $("#modal-user-action-skip");
    const hintEl = $("#modal-user-action-hint");
    const confirmBtn = $("#modal-user-action-confirm");
    if (titleEl) titleEl.textContent = titleMap[action] || "确认操作";
    if (msgEl) msgEl.innerHTML = msgMap[action] || "";
    renderUserActionTarget(applicable, action);
    if (skipEl) {
      if (skipBits.length) {
        skipEl.hidden = false;
        skipEl.textContent = skipBits.join("，") + "。";
      } else {
        skipEl.hidden = true;
        skipEl.textContent = "";
      }
    }
    if (hintEl) {
      hintEl.textContent = hintMap[action] || "";
      hintEl.className =
        "user-action-hint " +
        (action === "enable" ? "is-success" : action === "remove" ? "is-danger" : "is-warning");
    }
    if (confirmBtn) {
      confirmBtn.className = confirmCls;
      confirmBtn.textContent = confirmText;
    }
    $("#modal-user-action")?.classList.add("show");
  }

  function closeUserActionConfirm() {
    pendingUserAction = null;
    renderUserActionTarget([], "disable");
    const skipEl = $("#modal-user-action-skip");
    if (skipEl) {
      skipEl.hidden = true;
      skipEl.textContent = "";
    }
    $("#modal-user-action")?.classList.remove("show");
  }

  function confirmUserAction() {
    const pending = pendingUserAction;
    if (!pending) {
      closeUserActionConfirm();
      return;
    }
    const action = pending.action;
    const usernames = pending.usernames || (pending.username ? [pending.username] : []);
    const names = [];
    let ok = 0;

    if (action === "disable" || action === "enable") {
      usernames.forEach((un) => {
        const u = findLdapUser(un);
        if (!u) return;
        if (action === "disable") {
          if (u.status !== "active") return;
          u.status = "disabled";
        } else {
          if (u.status === "active") return;
          u.status = "active";
        }
        userMgmtSelected.delete(u.username);
        names.push(u.name);
        ok += 1;
      });
      closeUserActionConfirm();
      if (!ok) {
        toast("没有可操作的用户", "warning");
        renderUserMgmt();
        return;
      }
      if (action === "disable") {
        toast(ok > 1 ? `已停用 ${ok} 名用户` : `已停用用户 ${names[0]}`, "warning");
      } else {
        toast(ok > 1 ? `已启用 ${ok} 名用户` : `已启用用户 ${names[0]}`);
      }
      renderUserMgmt();
      return;
    }

    if (action === "remove") {
      usernames.forEach((un) => {
        const u = findLdapUser(un);
        if (!u) return;
        if (isCurrentLoginUser(u)) return;
        names.push(u.name);
        MOCK.ldapUsers = (MOCK.ldapUsers || []).filter((x) => x.username !== u.username);
        (MOCK.teams || []).forEach((t) => {
          t.members = (t.members || []).filter((m) => m !== u.name);
        });
        userMgmtSelected.delete(u.username);
        ok += 1;
      });
      closeUserActionConfirm();
      if (!ok) {
        toast("没有可移除的用户", "warning");
        renderUserMgmt();
        return;
      }
      toast(ok > 1 ? `已从平台移除 ${ok} 名用户` : `已从平台移除用户 ${names[0]}`, "warning");
      renderUserMgmt();
    }
  }

  function renderUserMgmt() {
    const body = $("#user-mgmt-body");
    if (!body) return;
    pruneUserMgmtSelection();

    // 同步角色 / 团队筛选项（名称可改、团队可增删）
    const roleFilter = $("#user-filter-role");
    if (roleFilter) {
      const prev = userMgmtFilter.roleId || "all";
      fillRoleSelectOptions(roleFilter, prev, { includeAll: true, allLabel: "全部角色" });
      roleFilter.value = prev;
    }
    const teamFilter = $("#user-filter-team");
    if (teamFilter) {
      userMgmtFilter.teamId = fillUserTeamFilterOptions(teamFilter, userMgmtFilter.teamId || "all");
    }

    const list = filteredUserMgmtList();
    const total = list.length;
    const pageSize = userMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (userMgmtFilter.page > totalPages) userMgmtFilter.page = totalPages;
    if (userMgmtFilter.page < 1) userMgmtFilter.page = 1;
    const start = (userMgmtFilter.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);
    const pageAllSelected =
      pageList.length > 0 && pageList.every((u) => userMgmtSelected.has(u.username));
    const pageSomeSelected = pageList.some((u) => userMgmtSelected.has(u.username));

    body.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th class="th-check">
              <input type="checkbox" id="user-mgmt-check-all" title="全选当前页" ${pageAllSelected ? "checked" : ""} ${
                pageSomeSelected && !pageAllSelected ? "data-indeterminate=1" : ""
              } ${pageList.length ? "" : "disabled"} />
            </th>
            <th>用户</th><th>账号</th><th>邮箱</th><th>部门 / 职位</th><th>角色</th><th>所属团队</th><th>状态</th><th>最近登录</th><th class="th-actions">操作</th>
          </tr></thead>
          <tbody>
            ${
              pageList.length
                ? pageList
                    .map((u) => {
                      const teams = userTeamIdsOf(u)
                        .map((id) => findTeam(id)?.name)
                        .filter(Boolean);
                      const roleId = u.roleId || "role-algo";
                      const roleName = getRoleName(roleId);
                      const roleBadgeClass = roleId === "role-sre" ? "badge-info" : "badge-healthy";
                      const checked = userMgmtSelected.has(u.username);
                      return `
                <tr class="${checked ? "is-row-selected" : ""}">
                  <td class="td-check">
                    <input type="checkbox" class="user-mgmt-check" data-um-check="${escapeHtml(u.username)}" ${
                      checked ? "checked" : ""
                    } aria-label="选择 ${escapeHtml(u.name || u.username)}" />
                  </td>
                  <td><strong>${escapeHtml(u.name)}</strong></td>
                  <td class="mono">${escapeHtml(u.username)}</td>
                  <td class="mono" style="font-size:12px">${escapeHtml(u.email || "—")}</td>
                  <td>
                    <div style="font-size:12.5px">${escapeHtml(u.department || "—")}</div>
                    <div class="text-muted" style="font-size:11.5px">${escapeHtml(u.title || "")}</div>
                  </td>
                  <td>
                    <span class="badge ${roleBadgeClass}" title="${escapeHtml(roleMenusHint(roleId))}">${escapeHtml(roleName)}</span>
                  </td>
                  <td>${
                    teams.length
                      ? teams.map((n) => `<span class="tag" style="margin:2px">${escapeHtml(n)}</span>`).join("")
                      : '<span class="text-muted">未加入团队</span>'
                  }</td>
                  <td>${
                    u.status === "active"
                      ? '<span class="badge badge-healthy">启用</span>'
                      : '<span class="badge badge-cancelled">停用</span>'
                  }</td>
                  <td class="mono text-muted">${u.lastLogin || "—"}</td>
                  <td class="td-actions">
                    <div class="job-actions job-actions-stack">
                      <div class="job-actions-row">
                        <button type="button" class="btn btn-secondary btn-sm" data-user-role="${escapeHtml(u.username)}">角色授权</button>
                        ${
                          u.status === "active"
                            ? `<button type="button" class="btn btn-secondary btn-sm" data-user-disable="${escapeHtml(u.username)}">停用</button>`
                            : `<button type="button" class="btn btn-primary btn-sm" data-user-enable="${escapeHtml(u.username)}">启用</button>`
                        }
                      </div>
                      <div class="job-actions-row">
                        <button type="button" class="btn btn-danger btn-sm" data-user-remove="${escapeHtml(u.username)}" title="从平台用户列表移除">移除</button>
                      </div>
                    </div>
                  </td>
                </tr>`;
                    })
                    .join("")
                : `<tr><td colspan="10"><div class="empty-state">${
                    userMgmtFilter.status !== "all" ||
                    (userMgmtFilter.roleId && userMgmtFilter.roleId !== "all") ||
                    (userMgmtFilter.teamId && userMgmtFilter.teamId !== "all") ||
                    (userMgmtFilter.q || "").trim()
                      ? "没有匹配的用户"
                      : "暂无平台用户，请点击「从 LDAP 添加」"
                  }</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${
        total
          ? renderPager({
              total,
              page: userMgmtFilter.page,
              pageSize,
              key: "user-mgmt",
            })
          : ""
      }`;

    syncUserMgmtBatchBar();

    const checkAll = $("#user-mgmt-check-all");
    if (checkAll) {
      if (pageSomeSelected && !pageAllSelected) checkAll.indeterminate = true;
      checkAll.addEventListener("change", () => {
        pageList.forEach((u) => {
          if (checkAll.checked) userMgmtSelected.add(u.username);
          else userMgmtSelected.delete(u.username);
        });
        renderUserMgmt();
      });
    }
    $$(".user-mgmt-check").forEach((cb) =>
      cb.addEventListener("change", () => {
        const un = cb.dataset.umCheck;
        if (!un) return;
        if (cb.checked) userMgmtSelected.add(un);
        else userMgmtSelected.delete(un);
        renderUserMgmt();
      })
    );

    const search = $("#user-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", () => {
        userMgmtFilter.q = search.value || "";
        userMgmtFilter.page = 1;
        renderUserMgmt();
      });
    }
    const st = $("#user-filter-status");
    if (st && !st.dataset.bound) {
      st.dataset.bound = "1";
      st.addEventListener("change", () => {
        userMgmtFilter.status = st.value;
        userMgmtFilter.page = 1;
        renderUserMgmt();
      });
    }
    if (roleFilter && !roleFilter.dataset.bound) {
      roleFilter.dataset.bound = "1";
      roleFilter.addEventListener("change", () => {
        userMgmtFilter.roleId = roleFilter.value || "all";
        userMgmtFilter.page = 1;
        renderUserMgmt();
      });
    }
    if (teamFilter && !teamFilter.dataset.bound) {
      teamFilter.dataset.bound = "1";
      teamFilter.addEventListener("change", () => {
        userMgmtFilter.teamId = teamFilter.value || "all";
        userMgmtFilter.page = 1;
        renderUserMgmt();
      });
    }

    $$("[data-user-role]").forEach((b) =>
      b.addEventListener("click", () => openUserRoleModal(b.dataset.userRole))
    );
    $$("[data-user-disable]").forEach((b) =>
      b.addEventListener("click", () => openUserActionConfirm("disable", b.dataset.userDisable))
    );
    $$("[data-user-enable]").forEach((b) =>
      b.addEventListener("click", () => openUserActionConfirm("enable", b.dataset.userEnable))
    );
    $$("[data-user-remove]").forEach((b) =>
      b.addEventListener("click", () => openUserActionConfirm("remove", b.dataset.userRemove))
    );

    bindPager(
      "user-mgmt",
      () => ({ page: userMgmtFilter.page, pageSize: userMgmtFilter.pageSize, total }),
      (p) => {
        userMgmtFilter.page = p;
      },
      (s) => {
        userMgmtFilter.pageSize = s;
      },
      renderUserMgmt
    );
  }

  /* ---------- 用户角色授权 ---------- */
  /**
   * @param {string|string[]} usernameOrUsernames
   */
  function openUserRoleModal(usernameOrUsernames) {
    const usernames = [
      ...new Set((Array.isArray(usernameOrUsernames) ? usernameOrUsernames : [usernameOrUsernames]).filter(Boolean)),
    ];
    const users = usernames.map(findLdapUser).filter(Boolean);
    if (!users.length) {
      toast(usernames.length ? "未找到用户" : "请先选择用户", usernames.length ? "error" : "warning");
      return;
    }
    pendingUserRoleUsernames = users.map((u) => u.username);
    $("#modal-user-role-error")?.classList.add("hidden");

    const multi = users.length > 1;
    const first = users[0];
    const titleEl = $("#modal-user-role-title");
    const leadEl = $("#modal-user-role .modal-lead");
    const confBtn = $("#modal-user-role-confirm");
    if (titleEl) titleEl.textContent = multi ? "批量角色授权" : "角色授权";
    if (leadEl) {
      leadEl.textContent = multi
        ? "为所选用户指定同一平台角色，决定登录后可见的侧栏菜单范围。"
        : "为用户指定平台角色，决定登录后可见的侧栏菜单范围。";
    }
    if (confBtn) confBtn.textContent = multi ? `保存授权（${users.length} 人）` : "保存授权";

    const roleIds = [...new Set(users.map((u) => u.roleId || "role-algo"))];
    const currentId = roleIds.length === 1 ? roleIds[0] : null;
    const currentName = currentId ? getRoleName(currentId) : "";

    const av = $("#modal-user-role-avatar");
    const nameEl = $("#modal-user-role-name");
    const meta = $("#modal-user-role-meta");
    const curEl = $("#modal-user-role-current");
    if (av) av.textContent = multi ? String(users.length) : (first.name || first.username || "用").slice(0, 1);
    if (nameEl) nameEl.textContent = multi ? `已选 ${users.length} 人` : first.name || first.username || "—";
    if (meta) {
      if (multi) {
        const show = users.slice(0, 10);
        const more = users.length - show.length;
        meta.innerHTML = `
          <div class="user-role-target-chips">
            ${show.map((u) => `<span class="node-dc-chip">${escapeHtml(u.name || u.username)}</span>`).join("")}
            ${more > 0 ? `<span class="text-muted" style="font-size:12px">+${more} 人</span>` : ""}
          </div>`;
      } else {
        const line1 = [first.username, first.email].filter(Boolean).join(" · ");
        const line2 = first.department || "";
        meta.innerHTML = `
          <div class="user-role-target-line mono">${escapeHtml(line1 || "—")}</div>
          ${line2 ? `<div class="user-role-target-dept">${escapeHtml(line2)}</div>` : ""}`;
      }
    }
    if (curEl) {
      if (currentId) {
        curEl.innerHTML = `<span class="user-role-current-label">${
          multi ? "当前角色（一致）" : "当前角色"
        }</span><span class="user-role-current-badge">${escapeHtml(currentName)}</span>`;
      } else {
        const counts = {};
        users.forEach((u) => {
          const id = u.roleId || "role-algo";
          counts[id] = (counts[id] || 0) + 1;
        });
        const bits = Object.entries(counts)
          .map(([id, n]) => `${escapeHtml(getRoleName(id))} ${n}`)
          .join(" · ");
        curEl.innerHTML = `<span class="user-role-current-label">当前角色不一</span><span class="user-role-current-badge is-mixed">${bits}</span>`;
      }
    }

    const box = $("#modal-user-role-options");
    if (box) {
      box.innerHTML = (MOCK.roles || [])
        .map((r) => {
          const selected = !!currentId && r.id === currentId;
          const isCurrent = selected;
          const menuTags = (r.menus || [])
            .map(
              (m) =>
                `<span class="role-menu-chip">${escapeHtml(MENU_SECTION_LABELS[m] || m)}</span>`
            )
            .join("");
          return `
          <label class="role-option ${selected ? "is-selected" : ""}" data-role-id="${escapeHtml(r.id)}">
            <span class="role-option-radio" aria-hidden="true"></span>
            <input type="radio" name="user-role-pick" value="${escapeHtml(r.id)}" ${selected ? "checked" : ""} />
            <span class="role-option-body">
              <span class="role-option-head">
                <span class="role-option-title">${escapeHtml(r.name)}</span>
                ${isCurrent ? '<span class="role-option-current-tag">当前</span>' : ""}
              </span>
              <span class="role-option-desc">${escapeHtml(r.desc || "—")}</span>
              <span class="role-option-menus" aria-label="菜单权限">
                <span class="role-option-menus-label">菜单权限</span>
                <span class="role-option-menus-chips">${menuTags || '<span class="text-muted">无</span>'}</span>
              </span>
            </span>
          </label>`;
        })
        .join("");
      $$('input[name="user-role-pick"]', box).forEach((input) => {
        input.addEventListener("change", () => {
          $$(".role-option", box).forEach((el) => {
            el.classList.toggle("is-selected", !!el.querySelector('input[type="radio"]')?.checked);
          });
        });
      });
    }
    $("#modal-user-role")?.classList.add("show");
  }

  function closeUserRoleModal() {
    pendingUserRoleUsernames = null;
    const confBtn = $("#modal-user-role-confirm");
    if (confBtn) confBtn.textContent = "保存授权";
    $("#modal-user-role")?.classList.remove("show");
  }

  function confirmUserRole() {
    const usernames = pendingUserRoleUsernames || [];
    if (!usernames.length) {
      closeUserRoleModal();
      return;
    }
    const picked = document.querySelector('input[name="user-role-pick"]:checked');
    const roleId = picked?.value;
    if (!roleId || !findRole(roleId)) {
      const err = $("#modal-user-role-error");
      if (err) {
        err.textContent = "请选择角色";
        err.classList.remove("hidden");
      }
      return;
    }
    let ok = 0;
    let lastName = "";
    usernames.forEach((un) => {
      const u = findLdapUser(un);
      if (!u) return;
      u.roleId = roleId;
      lastName = u.name;
      ok += 1;
      userMgmtSelected.delete(u.username);
      if (MOCK.user?.username === u.username && !MOCK.user?.isAdmin) {
        applyUserToShell({
          ...MOCK.user,
          roleId,
          role: getRoleName(roleId),
        });
      }
    });
    closeUserRoleModal();
    if (!ok) {
      toast("未找到用户", "error");
      renderUserMgmt();
      return;
    }
    const roleName = getRoleName(roleId);
    toast(ok > 1 ? `已将 ${ok} 名用户授权为「${roleName}」` : `已将 ${lastName} 授权为「${roleName}」`);
    renderUserMgmt();
  }

  /* ---------- 角色管理 ---------- */
  function renderRoleMgmt() {
    const body = $("#role-mgmt-body");
    if (!body) return;
    const roles = MOCK.roles || [];
    const users = MOCK.ldapUsers || [];

    body.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>角色名称</th>
            <th>说明</th>
            <th>菜单权限</th>
            <th>用户数</th>
            <th>最近更新</th>
            <th class="th-actions">操作</th>
          </tr></thead>
          <tbody>
            ${
              roles.length
                ? roles
                    .map((r) => {
                      const count = users.filter((u) => (u.roleId || "role-algo") === r.id).length;
                      const menuTags = (r.menus || [])
                        .map(
                          (m) =>
                            `<span class="tag" style="margin:2px">${escapeHtml(MENU_SECTION_LABELS[m] || m)}</span>`
                        )
                        .join("");
                      return `
                <tr>
                  <td>
                    <strong>${escapeHtml(r.name)}</strong>
                    ${r.builtin ? '<span class="badge badge-info" style="margin-left:6px">内置</span>' : ""}
                  </td>
                  <td class="text-muted" style="font-size:12.5px">${escapeHtml(r.desc || "—")}</td>
                  <td>${menuTags || '<span class="text-muted">—</span>'}</td>
                  <td class="mono">${count}</td>
                  <td>
                    <div class="mono text-muted" style="font-size:12px">${escapeHtml(r.updatedAt || "—")}</div>
                    <div class="text-muted" style="font-size:11.5px">${escapeHtml(r.updatedBy || "")}</div>
                  </td>
                  <td class="td-actions">
                    <div class="job-actions">
                      <button type="button" class="btn btn-secondary btn-sm" data-role-rename="${escapeHtml(r.id)}">编辑</button>
                    </div>
                  </td>
                </tr>`;
                    })
                    .join("")
                : `<tr><td colspan="6"><div class="empty-state">暂无角色</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      <div class="text-muted" style="padding:10px 16px;font-size:12px;line-height:1.55">
        共 ${roles.length} 个角色 ·
        算法工程师仅可见「训练中心」；SRE工程师可见「训练中心」与「运维中心」·
        平台中心仅平台管理员可访问 · 角色权限范围固定，支持改名
      </div>`;

    $$("[data-role-rename]").forEach((b) =>
      b.addEventListener("click", () => openRoleRenameModal(b.dataset.roleRename))
    );
  }

  function openRoleRenameModal(roleId) {
    const role = findRole(roleId);
    if (!role) {
      toast("未找到角色", "error");
      return;
    }
    pendingRoleRenameId = roleId;
    const input = $("#role-rename-name");
    if (input) input.value = role.name || "";
    $("#modal-role-rename-error")?.classList.add("hidden");
    $("#modal-role-rename")?.classList.add("show");
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 50);
  }

  function closeRoleRenameModal() {
    pendingRoleRenameId = null;
    $("#modal-role-rename")?.classList.remove("show");
  }

  function confirmRoleRename() {
    const roleId = pendingRoleRenameId;
    const role = findRole(roleId);
    if (!role) {
      closeRoleRenameModal();
      toast("未找到角色", "error");
      return;
    }
    const name = ($("#role-rename-name")?.value || "").trim();
    const err = $("#modal-role-rename-error");
    if (!name) {
      if (err) {
        err.textContent = "请输入角色名称";
        err.classList.remove("hidden");
      }
      return;
    }
    if (name.length > 32) {
      if (err) {
        err.textContent = "角色名称不超过 32 个字符";
        err.classList.remove("hidden");
      }
      return;
    }
    const dup = (MOCK.roles || []).find((r) => r.id !== roleId && r.name === name);
    if (dup) {
      if (err) {
        err.textContent = "已存在同名角色";
        err.classList.remove("hidden");
      }
      return;
    }
    const oldName = role.name;
    role.name = name;
    role.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    role.updatedBy = MOCK.user?.name || "管理员";

    // 刷新当前登录用户侧栏角色文案
    if (MOCK.user?.roleId === roleId && !MOCK.user?.isAdmin) {
      applyUserToShell({ ...MOCK.user, role: name, roleId });
    }

    closeRoleRenameModal();
    toast(oldName === name ? "角色名称未变更" : `角色已改名：${oldName} → ${name}`);
    renderRoleMgmt();
    // 用户管理筛选下拉依赖角色名
    if ($("#user-filter-role")) fillRoleSelectOptions($("#user-filter-role"), userMgmtFilter.roleId || "all", {
      includeAll: true,
      allLabel: "全部角色",
    });
  }

  /* ---------- 系统配置（LDAP 等） ---------- */
  let systemConfigTab = "ldap";

  function renderSystemConfig(tab) {
    const target = tab || systemConfigTab || "ldap";
    systemConfigTab = target;

    initTabs("#sys-config-tabs", "#sys-config-panels", (t) => {
      systemConfigTab = t;
      if (t === "ldap") renderLdapConfigPanel();
    });

    $$("#sys-config-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === target));
    $$("#sys-config-panels .tab-panel").forEach((p) =>
      p.classList.toggle("active", p.dataset.panel === target)
    );
    if (target === "ldap") renderLdapConfigPanel();
  }

  function bindLdapConfigActions() {
    // 按钮在 Tab 内固定，每次进入面板重新绑定
    const testBtn = $("#btn-ldap-test");
    const saveBtn = $("#btn-ldap-save");
    if (testBtn) testBtn.onclick = testLdapConfig;
    if (saveBtn) saveBtn.onclick = saveLdapConfig;
  }

  function renderLdapConfigPanel() {
    const cfg = MOCK.ldapConfig || {};
    const formEl = $("#ldap-config-form");
    if (!formEl) return;

    formEl.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>连接参数</h3></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group full">
              <label for="ldap-name">配置名称</label>
              <input id="ldap-name" type="text" value="${escapeHtml(cfg.name || "")}" />
            </div>
            <div class="form-group">
              <label for="ldap-host">主机 <span class="req">*</span></label>
              <input id="ldap-host" type="text" value="${escapeHtml(cfg.host || "")}" placeholder="ldap.example.com" />
            </div>
            <div class="form-group">
              <label for="ldap-port">端口 <span class="req">*</span></label>
              <input id="ldap-port" type="number" value="${cfg.port ?? 636}" min="1" max="65535" />
            </div>
            <div class="form-group full">
              <label class="checkbox-inline">
                <input type="checkbox" id="ldap-tls" ${cfg.useTls ? "checked" : ""} /> 使用 TLS / LDAPS
              </label>
            </div>
            <div class="form-group full">
              <label for="ldap-base-dn">Base DN <span class="req">*</span></label>
              <input id="ldap-base-dn" type="text" value="${escapeHtml(cfg.baseDn || "")}" class="mono" />
            </div>
            <div class="form-group full">
              <label for="ldap-bind-dn">Bind DN <span class="req">*</span></label>
              <input id="ldap-bind-dn" type="text" value="${escapeHtml(cfg.bindDn || "")}" class="mono" />
            </div>
            <div class="form-group full">
              <div class="field-label-row">
                <label for="ldap-bind-pwd">Bind 密码</label>
                <button type="button" class="field-help" data-tip="原型演示不校验真实密码；正式环境加密存储" aria-label="Bind 密码说明">?</button>
              </div>
              <input id="ldap-bind-pwd" type="password" value="${escapeHtml(cfg.bindPassword || "")}" />
            </div>
            <div class="form-group">
              <label for="ldap-timeout">超时（秒）</label>
              <input id="ldap-timeout" type="number" value="${cfg.timeoutSec ?? 10}" min="1" max="120" />
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>检索与属性映射</h3></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group full">
              <div class="field-label-row">
                <label for="ldap-user-filter">用户认证 Filter</label>
                <button type="button" class="field-help" data-tip="{username} 将替换为登录账号" aria-label="用户认证 Filter 说明">?</button>
              </div>
              <input id="ldap-user-filter" type="text" value="${escapeHtml(cfg.userFilter || "")}" class="mono" />
            </div>
            <div class="form-group full">
              <div class="field-label-row">
                <label for="ldap-search-filter">目录搜索 Filter</label>
                <button type="button" class="field-help" data-tip="{q} 将替换为搜索关键词" aria-label="目录搜索 Filter 说明">?</button>
              </div>
              <input id="ldap-search-filter" type="text" value="${escapeHtml(cfg.searchFilter || "")}" class="mono" />
            </div>
            <div class="form-group">
              <label for="ldap-attr-user">账号属性</label>
              <input id="ldap-attr-user" type="text" value="${escapeHtml(cfg.attrUsername || "uid")}" class="mono" />
            </div>
            <div class="form-group">
              <label for="ldap-attr-name">姓名属性</label>
              <input id="ldap-attr-name" type="text" value="${escapeHtml(cfg.attrName || "cn")}" class="mono" />
            </div>
            <div class="form-group">
              <label for="ldap-attr-email">邮箱属性</label>
              <input id="ldap-attr-email" type="text" value="${escapeHtml(cfg.attrEmail || "mail")}" class="mono" />
            </div>
            <div class="form-group">
              <label for="ldap-attr-dept">部门属性</label>
              <input id="ldap-attr-dept" type="text" value="${escapeHtml(cfg.attrDepartment || "department")}" class="mono" />
            </div>
            <div class="form-group full">
              <label for="ldap-attr-title">职位属性</label>
              <input id="ldap-attr-title" type="text" value="${escapeHtml(cfg.attrTitle || "title")}" class="mono" />
            </div>
          </div>
        </div>
      </div>`;

    bindLdapConfigActions();
  }

  function readLdapConfigForm() {
    const cfg = MOCK.ldapConfig || (MOCK.ldapConfig = {});
    return {
      ...cfg,
      enabled: true,
      name: $("#ldap-name")?.value?.trim() || cfg.name,
      host: $("#ldap-host")?.value?.trim() || "",
      port: +($("#ldap-port")?.value || 0),
      useTls: Boolean($("#ldap-tls")?.checked),
      baseDn: $("#ldap-base-dn")?.value?.trim() || "",
      bindDn: $("#ldap-bind-dn")?.value?.trim() || "",
      bindPassword: $("#ldap-bind-pwd")?.value || cfg.bindPassword,
      userFilter: $("#ldap-user-filter")?.value?.trim() || cfg.userFilter,
      searchFilter: $("#ldap-search-filter")?.value?.trim() || cfg.searchFilter,
      attrUsername: $("#ldap-attr-user")?.value?.trim() || "uid",
      attrName: $("#ldap-attr-name")?.value?.trim() || "cn",
      attrEmail: $("#ldap-attr-email")?.value?.trim() || "mail",
      attrDepartment: $("#ldap-attr-dept")?.value?.trim() || "department",
      attrTitle: $("#ldap-attr-title")?.value?.trim() || "title",
      timeoutSec: +($("#ldap-timeout")?.value || 10),
    };
  }

  function saveLdapConfig() {
    const next = readLdapConfigForm();
    if (!next.host || !next.port || !next.baseDn || !next.bindDn) {
      toast("请填写主机、端口、Base DN、Bind DN", "error");
      return;
    }
    Object.assign(MOCK.ldapConfig, next, {
      updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      updatedBy: MOCK.user?.name || "管理员",
    });
    toast("LDAP 配置已保存");
    renderLdapConfigPanel();
  }

  function testLdapConfig() {
    const next = readLdapConfigForm();
    if (!next.host || !next.baseDn) {
      toast("请先填写主机与 Base DN", "error");
      return;
    }
    // 原型：模拟测试结果
    const ok = Boolean(next.host && next.bindDn);
    Object.assign(MOCK.ldapConfig, next, {
      lastTestAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      lastTestResult: ok ? "success" : "fail",
      lastTestMessage: ok
        ? `连接成功 · ${next.useTls ? "LDAPS" : "LDAP"} ${next.host}:${next.port} · Base DN 可检索 · 目录约 ${(MOCK.ldapDirectory || []).length} 条`
        : "连接失败：请检查主机 / Bind DN",
    });
    toast(ok ? "LDAP 连接测试成功" : "LDAP 连接测试失败", ok ? "success" : "error");
    renderLdapConfigPanel();
  }

  /* ---------- 从 LDAP 添加用户 ---------- */
  let ldapAddSelected = new Set();

  function updateLdapRoleHint() {
    const sel = $("#ldap-user-role");
    const hint = $("#ldap-user-role-hint");
    if (!hint) return;
    const roleId = sel?.value || "role-algo";
    hint.textContent = roleMenusHint(roleId) || "";
  }

  function openUserLdapModal() {
    ldapAddSelected = new Set();
    const roleSel = $("#ldap-user-role");
    fillRoleSelectOptions(roleSel, "role-algo");
    if (roleSel) roleSel.value = "role-algo";
    updateLdapRoleHint();
    if ($("#ldap-user-search")) $("#ldap-user-search").value = "";
    $("#ldap-user-add-error")?.classList.add("hidden");
    renderLdapUserResults("");
    $("#modal-user-ldap")?.classList.add("show");
  }

  function closeUserLdapModal() {
    $("#modal-user-ldap")?.classList.remove("show");
    ldapAddSelected = new Set();
  }

  function searchLdapDirectory(q) {
    const ql = (q || "").trim().toLowerCase();
    let list = [...(MOCK.ldapDirectory || [])];
    if (ql) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(ql) ||
          (u.username || "").toLowerCase().includes(ql) ||
          (u.email || "").toLowerCase().includes(ql) ||
          (u.department || "").toLowerCase().includes(ql)
      );
    }
    return list;
  }

  function renderLdapUserResults(q) {
    const box = $("#ldap-user-results");
    if (!box) return;
    const list = searchLdapDirectory(q);
    const hint = $("#ldap-user-selected-hint");
    if (hint) hint.textContent = `已选 ${ldapAddSelected.size} 人`;

    if (!list.length) {
      box.innerHTML = `<div class="empty-state" style="padding:28px">未检索到匹配的 LDAP 用户</div>`;
      return;
    }

    box.innerHTML = list
      .map((u) => {
        const already = isPlatformUser(u.username);
        const checked = !already && ldapAddSelected.has(u.username);
        return `
        <label class="ldap-user-row ${already ? "is-added" : ""} ${checked ? "is-checked" : ""}">
          <input type="checkbox" value="${escapeHtml(u.username)}"
            ${already ? "disabled" : checked ? "checked" : ""}
            data-ldap-pick="${escapeHtml(u.username)}"
            ${already ? 'aria-label="已在平台，不可重复添加"' : ""} />
          <span class="ldap-user-meta">
            <strong>${escapeHtml(u.name)}</strong>
            <span class="mono text-muted" style="font-size:11.5px">${escapeHtml(u.username)}</span>
            <span class="text-muted" style="font-size:11.5px">${escapeHtml(u.email || "")}</span>
            <span class="text-muted" style="font-size:11.5px;display:block">${escapeHtml(u.department || "")} · ${escapeHtml(u.title || "")}</span>
          </span>
          ${already ? '<span class="badge badge-info">已在平台</span>' : ""}
        </label>`;
      })
      .join("");

    $$("[data-ldap-pick]").forEach((input) => {
      // 已在平台：禁用且未勾选，阻止通过 label 点击切换
      if (input.disabled) {
        input.addEventListener("click", (e) => e.preventDefault());
        return;
      }
      input.addEventListener("change", () => {
        const un = input.value;
        if (input.checked) ldapAddSelected.add(un);
        else ldapAddSelected.delete(un);
        if (hint) hint.textContent = `已选 ${ldapAddSelected.size} 人`;
        input.closest(".ldap-user-row")?.classList.toggle("is-checked", input.checked);
      });
    });
  }

  function confirmAddLdapUsers() {
    const err = $("#ldap-user-add-error");
    if (!ldapAddSelected.size) {
      if (err) {
        err.textContent = "请至少勾选一名 LDAP 用户";
        err.classList.remove("hidden");
      }
      return;
    }
    const roleId = $("#ldap-user-role")?.value || "role-algo";
    if (!findRole(roleId)) {
      if (err) {
        err.textContent = "请选择有效的角色权限";
        err.classList.remove("hidden");
      }
      return;
    }
    let added = 0;
    ldapAddSelected.forEach((username) => {
      if (isPlatformUser(username)) return;
      const dir = (MOCK.ldapDirectory || []).find((u) => u.username === username);
      if (!dir) return;
      MOCK.ldapUsers.push({
        username: dir.username,
        name: dir.name,
        email: dir.email,
        department: dir.department,
        title: dir.title,
        roleId,
        status: "active",
        lastLogin: "—",
        teamIds: [],
        source: "ldap",
        addedAt: new Date().toISOString().slice(0, 10),
      });
      added++;
    });
    closeUserLdapModal();
    toast(
      added
        ? `已添加 ${added} 名平台用户（角色：${getRoleName(roleId)}）`
        : "没有新用户被添加"
    );
    renderUserMgmt();
  }

  function renderTeamMgmt() {
    const listEl = $("#team-mgmt-list");
    const detailEl = $("#team-mgmt-detail-body");
    if (!listEl) return;

    let projects = [...(MOCK.teams || [])];
    const q = (teamMgmtFilter.q || "").toLowerCase();
    if (q) {
      projects = projects.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.desc || "").toLowerCase().includes(q) ||
          (p.owner || "").toLowerCase().includes(q)
      );
    }

    const total = projects.length;
    const pageSize = teamMgmtFilter.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (teamMgmtFilter.page > totalPages) teamMgmtFilter.page = totalPages;
    if (teamMgmtFilter.page < 1) teamMgmtFilter.page = 1;
    const start = (teamMgmtFilter.page - 1) * pageSize;
    const pageList = projects.slice(start, start + pageSize);

    // 选中项不在筛选结果中时，默认选中当前页第一条
    if (total && !projects.some((p) => p.id === currentTeamId)) {
      currentTeamId = pageList[0]?.id || projects[0].id;
    }

    listEl.innerHTML = pageList.length
      ? `<div class="rp-list">
        ${pageList
          .map((p) => {
            const active = p.id === currentTeamId;
            const qCount = (p.queueIds || []).length;
            return `
          <div class="rp-list-item ${active ? "active" : ""}" data-team="${p.id}">
            <div class="rp-list-title">${p.name}</div>
            <div class="rp-list-meta">
              <span>${(p.members || []).length} 成员</span>
              <span>${qCount} 队列</span>
              <span class="text-muted">${p.owner}</span>
            </div>
            <div class="text-muted" style="font-size:11.5px;margin-top:4px">${escapeHtml(p.desc || "")}</div>
          </div>`;
          })
          .join("")}
      </div>
      ${renderPager({
        total,
        page: teamMgmtFilter.page,
        pageSize,
        key: "team-mgmt",
      })}`
      : `<div class="empty-state">暂无团队</div>`;

    $$("[data-team]").forEach((el) =>
      el.addEventListener("click", () => {
        currentTeamId = el.dataset.team;
        renderTeamMgmt();
      })
    );

    bindPager(
      "team-mgmt",
      () => ({ page: teamMgmtFilter.page, pageSize: teamMgmtFilter.pageSize, total }),
      (p) => {
        teamMgmtFilter.page = p;
      },
      (s) => {
        teamMgmtFilter.pageSize = s;
      },
      renderTeamMgmt
    );

    const search = $("#team-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", () => {
        teamMgmtFilter.q = search.value || "";
        teamMgmtFilter.page = 1;
        renderTeamMgmt();
      });
    }

    const p = findTeam(currentTeamId);
    if (!detailEl) return;
    if (!p) {
      detailEl.innerHTML = `<div class="empty-state">请选择左侧团队</div>`;
      return;
    }

    const queues = queuesForTeam(p.id);
    detailEl.innerHTML = `
      <div class="rp-detail-head">
        <div>
          <h3 style="font-size:16px;color:var(--text-0);margin:0">${escapeHtml(p.name)}</h3>
          <p class="text-muted" style="font-size:12.5px;margin:6px 0 0">${escapeHtml(p.desc || "")}</p>
        </div>
        <button type="button" class="btn btn-secondary rp-detail-action" id="btn-team-edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
          编辑
        </button>
      </div>
      <div class="kv-list mt-16">
        <div class="kv-row"><span class="k">负责人</span><span class="v">${p.owner}</span></div>
        <div class="kv-row"><span class="k">创建时间</span><span class="v mono">${p.createdAt || "—"}</span></div>
      </div>

      <div class="form-section-title mt-16" style="display:flex;justify-content:space-between;align-items:center">
        <span>成员（${(p.members || []).length}）</span>
        <button type="button" class="btn btn-secondary rp-detail-action" id="btn-team-add-member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M19 8v6M16 11h6"/>
          </svg>
          添加成员
        </button>
      </div>
      <div class="rp-member-chips">
        ${(p.members || [])
          .map(
            (m) => `
          <span class="rp-chip">
            ${m}
            <button type="button" class="rp-chip-x" data-rm-member="${escapeHtml(m)}" title="移除">×</button>
          </span>`
          )
          .join("") || '<span class="text-muted">暂无成员</span>'}
      </div>

      <div class="form-section-title mt-16" style="display:flex;justify-content:space-between;align-items:center">
        <span>关联队列（${queues.length}）</span>
        <button type="button" class="btn btn-primary rp-detail-action" id="btn-team-link-queue">管理队列</button>
      </div>
      ${
        queues.length
          ? `<div class="rp-queue-cards">
            ${queues
              .map((q) => {
                const free = queueGpuFree(q);
                const pct = queueUtilPct(q);
                return `
              <div class="rp-queue-card">
                <div class="flex" style="justify-content:space-between;gap:8px;flex-wrap:wrap">
                  <strong style="font-size:13px">${q.displayName || q.name}</strong>
                  ${dcBadge(q.dc)}
                </div>
                <div class="text-muted mono" style="font-size:11px;margin-top:2px">${q.name}</div>
                <div style="font-size:12px;margin-top:8px">${q.gpuType} · ${q.gpuUsed}/${q.gpuQuota} · 剩余 ${free} ${q.requireIB ? "· IB" : ""}</div>
                <div class="progress mt-8" style="height:6px"><div class="progress-bar ${quotaBarClass(pct)}" style="width:${pct}%"></div></div>
              </div>`;
              })
              .join("")}
          </div>`
          : `<div class="empty-state" style="padding:16px">尚未关联队列，成员将无法提交训练任务</div>`
      }
    `;

    $("#btn-team-edit")?.addEventListener("click", () => openTeamForm(p.id));
    $("#btn-team-add-member")?.addEventListener("click", () => openTeamMemberModal(p.id));
    $("#btn-team-link-queue")?.addEventListener("click", () => openTeamQueueModal(p.id));
    $$("[data-rm-member]").forEach((b) =>
      b.addEventListener("click", () => {
        const name = b.dataset.rmMember;
        p.members = (p.members || []).filter((m) => m !== name);
        // sync ldap teamIds
        const lu = (MOCK.ldapUsers || []).find((u) => u.name === name);
        if (lu) lu.teamIds = (lu.teamIds || []).filter((id) => id !== p.id);
        toast(`已移除成员 ${name}`);
        renderTeamMgmt();
      })
    );
  }

  /** 平台可用且启用的用户（供负责人/成员选择） */
  function activePlatformUsers() {
    return (MOCK.ldapUsers || []).filter((u) => u.status === "active");
  }

  function setTeamOwnerSelection(user) {
    const hidden = $("#team-form-owner");
    const search = $("#team-form-owner-search");
    const chip = $("#team-owner-selected");
    const clearBtn = $("#team-owner-clear");
    const results = $("#team-owner-results");
    if (!user) {
      if (hidden) hidden.value = "";
      if (search) {
        search.value = "";
        search.classList.remove("is-locked");
        search.readOnly = false;
      }
      chip?.classList.add("hidden");
      if (chip) chip.innerHTML = "";
      clearBtn?.classList.add("hidden");
      results?.classList.add("hidden");
      return;
    }
    if (hidden) hidden.value = user.name;
    if (search) {
      search.value = `${user.name}（${user.username}）`;
      search.readOnly = true;
      search.classList.add("is-locked");
    }
    if (chip) {
      chip.classList.remove("hidden");
      chip.innerHTML = `
        <span class="user-picker-chip">
          <span class="user-picker-chip-avatar">${escapeHtml((user.name || "?").slice(0, 1))}</span>
          <span class="user-picker-chip-meta">
            <strong>${escapeHtml(user.name)}</strong>
            <span class="mono text-muted">${escapeHtml(user.username)}</span>
            <span class="text-muted">${escapeHtml(user.department || user.title || "")}</span>
          </span>
        </span>`;
    }
    clearBtn?.classList.remove("hidden");
    results?.classList.add("hidden");
  }

  function renderTeamOwnerResults(q) {
    const box = $("#team-owner-results");
    if (!box) return;
    if ($("#team-form-owner-search")?.readOnly) {
      box.classList.add("hidden");
      return;
    }
    const ql = (q || "").trim().toLowerCase();
    let list = activePlatformUsers();
    if (ql) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(ql) ||
          (u.username || "").toLowerCase().includes(ql) ||
          (u.email || "").toLowerCase().includes(ql) ||
          (u.department || "").toLowerCase().includes(ql)
      );
    }
    list = list.slice(0, 30);
    if (!list.length) {
      box.innerHTML = `<div class="user-picker-empty">无匹配的启用用户</div>`;
      box.classList.remove("hidden");
      return;
    }
    box.innerHTML = list
      .map(
        (u) => `
      <button type="button" class="user-picker-item" data-owner-user="${escapeHtml(u.username)}" role="option">
        <span class="user-picker-item-avatar">${escapeHtml((u.name || "?").slice(0, 1))}</span>
        <span class="user-picker-item-body">
          <span class="user-picker-item-line">
            <strong>${escapeHtml(u.name)}</strong>
            <span class="mono text-muted">${escapeHtml(u.username)}</span>
          </span>
          <span class="user-picker-item-sub text-muted">${escapeHtml(u.email || "")} · ${escapeHtml(u.department || "—")}</span>
        </span>
      </button>`
      )
      .join("");
    box.classList.remove("hidden");
    $$("[data-owner-user]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = activePlatformUsers().find((x) => x.username === btn.dataset.ownerUser);
        if (u) {
          setTeamOwnerSelection(u);
          $("#team-form-error")?.classList.add("hidden");
        }
      });
    });
  }

  function ensureTeamMembership(team, user) {
    if (!team || !user) return;
    if (!(team.members || []).includes(user.name)) {
      team.members = [...(team.members || []), user.name];
    }
    if (!(user.teamIds || []).includes(team.id)) {
      user.teamIds = [...(user.teamIds || []), team.id];
    }
  }

  /** 团队名称变更后，同步队列 / 任务 / 配置集上的展示名 */
  function syncTeamDenormName(team) {
    if (!team) return;
    (MOCK.queues || []).forEach((q) => {
      const ids = Array.isArray(q.teamIds) && q.teamIds.length ? q.teamIds : q.teamId ? [q.teamId] : [];
      if (ids.includes(team.id)) applyQueueTeams(q, ids);
    });
    (MOCK.jobs || []).forEach((j) => {
      if (j.teamId === team.id) j.teamName = team.name;
    });
    (MOCK.configSets || []).forEach((s) => {
      if (s.teamId === team.id) s.teamName = team.name;
    });
  }

  function openTeamForm(teamId) {
    const team = teamId ? findTeam(teamId) : null;
    const isEdit = !!team;
    const modal = $("#modal-team");
    if (modal) modal.dataset.editId = team?.id || "";

    const title = $("#modal-team-title");
    if (title) title.textContent = isEdit ? "编辑团队" : "新建团队";
    const confirm = $("#modal-team-confirm");
    if (confirm) confirm.textContent = isEdit ? "保存" : "创建团队";
    const lead = $("#team-form-lead");
    if (lead) {
      lead.innerHTML = isEdit
        ? "可修改团队名称、描述与负责人。成员与关联队列请在详情中管理。"
        : "创建后可在详情中添加成员、关联资源队列。负责人和成员须从<strong>平台可用用户</strong>中选择。";
    }

    $("#team-form-name").value = team?.name || "";
    $("#team-form-desc").value = team?.desc || "";
    $("#team-form-error")?.classList.add("hidden");

    if (isEdit) {
      const ownerUser =
        activePlatformUsers().find((u) => u.name === team.owner) ||
        (MOCK.ldapUsers || []).find((u) => u.name === team.owner) ||
        null;
      if (ownerUser) setTeamOwnerSelection(ownerUser);
      else setTeamOwnerSelection(null);
    } else {
      const me =
        activePlatformUsers().find(
          (u) =>
            u.username === MOCK.user?.username ||
            u.name === MOCK.user?.name
        ) || null;
      if (me) setTeamOwnerSelection(me);
      else setTeamOwnerSelection(null);
    }
    modal?.classList.add("show");
    setTimeout(() => $("#team-form-name")?.focus(), 40);
  }

  function closeTeamForm() {
    const modal = $("#modal-team");
    if (modal) modal.dataset.editId = "";
    modal?.classList.remove("show");
    setTeamOwnerSelection(null);
    $("#team-owner-results")?.classList.add("hidden");
  }

  function submitTeamForm() {
    const editId = $("#modal-team")?.dataset.editId || "";
    const existing = editId ? findTeam(editId) : null;
    const name = $("#team-form-name")?.value?.trim();
    const err = $("#team-form-error");
    if (!name) {
      if (err) {
        err.textContent = "请填写团队名称";
        err.classList.remove("hidden");
      }
      return;
    }
    if ((MOCK.teams || []).some((p) => p.name === name && p.id !== editId)) {
      if (err) {
        err.textContent = "团队名称已存在";
        err.classList.remove("hidden");
      }
      return;
    }
    const ownerName = $("#team-form-owner")?.value?.trim();
    let ownerUser = activePlatformUsers().find((u) => u.name === ownerName);
    if (!ownerUser && existing && existing.owner === ownerName) {
      ownerUser = (MOCK.ldapUsers || []).find((u) => u.name === ownerName) || null;
    }
    if (!ownerName || !ownerUser) {
      if (err) {
        err.textContent = "请从用户列表中选择负责人";
        err.classList.remove("hidden");
      }
      return;
    }
    const owner = ownerUser.name;
    const desc = $("#team-form-desc")?.value?.trim() || "";

    if (existing) {
      const prevName = existing.name;
      existing.name = name;
      existing.desc = desc;
      existing.owner = owner;
      ensureTeamMembership(existing, ownerUser);
      if (prevName !== name) syncTeamDenormName(existing);
      closeTeamForm();
      toast(`团队已更新: ${name}`);
      renderTeamMgmt();
      return;
    }

    const id = `team-${Date.now().toString(36)}`;
    const team = {
      id,
      name,
      desc,
      owner,
      members: [owner],
      queueIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
      status: "active",
    };
    MOCK.teams.unshift(team);
    ensureTeamMembership(team, ownerUser);
    currentTeamId = id;
    teamMgmtFilter.page = 1;
    teamMgmtFilter.q = "";
    if ($("#team-search")) $("#team-search").value = "";
    closeTeamForm();
    toast(`团队已创建: ${name}`);
    renderTeamMgmt();
  }

  function openTeamMemberModal(teamId) {
    $("#modal-team-member").dataset.teamId = teamId;
    $("#team-member-search").value = "";
    renderTeamMemberResults("");
    $("#modal-team-member")?.classList.add("show");
  }

  function closeTeamMemberModal() {
    $("#modal-team-member")?.classList.remove("show");
  }

  function renderTeamMemberResults(q) {
    const teamId = $("#modal-team-member")?.dataset.teamId;
    const p = findTeam(teamId);
    const box = $("#team-member-results");
    if (!box || !p) return;
    const ql = (q || "").toLowerCase();
    const users = (MOCK.ldapUsers || []).filter((u) => {
      if (u.status !== "active") return false;
      if ((p.members || []).includes(u.name)) return false;
      if (!ql) return true;
      return (
        u.name.toLowerCase().includes(ql) ||
        (u.username || "").toLowerCase().includes(ql) ||
        (u.email || "").toLowerCase().includes(ql)
      );
    });
    box.innerHTML = users.length
      ? users
          .slice(0, 20)
          .map(
            (u) => `
        <div class="rp-member-row">
          <div>
            <strong>${u.name}</strong>
            <span class="mono text-muted" style="font-size:11.5px;margin-left:6px">${u.username}</span>
            <div class="text-muted" style="font-size:11.5px">${u.department || ""}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-add-member="${escapeHtml(u.name)}">添加</button>
        </div>`
          )
          .join("")
      : `<div class="empty-state" style="padding:20px">无匹配用户或均已加入</div>`;

    $$("[data-add-member]").forEach((b) =>
      b.addEventListener("click", () => {
        const name = b.dataset.addMember;
        if (!(p.members || []).includes(name)) p.members.push(name);
        const lu = (MOCK.ldapUsers || []).find((u) => u.name === name);
        if (lu && !(lu.teamIds || []).includes(p.id)) {
          lu.teamIds = [...(lu.teamIds || []), p.id];
        }
        toast(`已添加成员 ${name}`);
        renderTeamMemberResults($("#team-member-search")?.value || "");
        renderTeamMgmt();
      })
    );
  }

  function openTeamQueueModal(teamId) {
    const p = findTeam(teamId);
    if (!p) return;
    $("#modal-team-queue").dataset.teamId = teamId;
    const box = $("#team-queue-checklist");
    box.innerHTML = (MOCK.queues || [])
      .map((q) => {
        const checked = (p.queueIds || []).includes(q.id);
        return `
        <label class="rp-check-row">
          <input type="checkbox" value="${q.id}" ${checked ? "checked" : ""} />
          <span>
            <strong>${q.displayName || q.name}</strong>
            ${dcBadge(q.dc)}
            <span class="tag">${q.gpuType}</span>
            <span class="text-muted" style="font-size:11.5px">额度 ${q.gpuQuota} · 剩余 ${queueGpuFree(q)}</span>
          </span>
        </label>`;
      })
      .join("");
    $("#modal-team-queue")?.classList.add("show");
  }

  function closeTeamQueueModal() {
    $("#modal-team-queue")?.classList.remove("show");
  }

  function submitTeamQueueModal() {
    const teamId = $("#modal-team-queue")?.dataset.teamId;
    const p = findTeam(teamId);
    if (!p) return;
    p.queueIds = $$("#team-queue-checklist input[type=checkbox]:checked").map((el) => el.value);
    (MOCK.queues || []).forEach((q) => {
      const ids = (MOCK.teams || []).filter((t) => (t.queueIds || []).includes(q.id)).map((t) => t.id);
      applyQueueTeams(q, ids);
    });
    closeTeamQueueModal();
    toast("队列关联已保存");
    renderTeamMgmt();
  }

  /* ---------- 节点调度状态 / 隔离入池（已并入节点管理） ---------- */
  let pendingMaintAction = null; // { action: isolate|recover|cordon|uncordon, nodes: string[], skipped: number }

  /** 调度状态：可调度 / 已隔离（平台故障隔离，与 K8s cordon 区分） */
  function maintStateOf(node) {
    if (node.isolateState === "isolated") return "isolated";
    return "ready";
  }

  /** 是否已 cordon（禁止调度）：K8s status 或 unschedulable 污点 */
  function isNodeCordoned(node) {
    if (!node) return false;
    if (node.status === "SchedulingDisabled") return true;
    return (nodeTaintsOf(node) || []).some((t) => t.key === "node.kubernetes.io/unschedulable");
  }

  function maintActionLabel(action) {
    return (
      {
        isolate: "隔离",
        recover: "入池",
        cordon: "封锁",
        uncordon: "解封",
        "set-dc": "数据中心",
        labels: "标签",
        taints: "污点",
      }[action] || action
    );
  }

  function maintActionBadgeCls(action) {
    return (
      {
        isolate: "badge-warning",
        recover: "badge-success",
        cordon: "badge-warning",
        uncordon: "badge-info",
        "set-dc": "badge-info",
        labels: "badge-info",
        taints: "badge-info",
      }[action] || "badge-info"
    );
  }

  function maintStateBadge(state) {
    const map = {
      isolated: { label: "已隔离", cls: "badge-warning" },
      ready: { label: "可调度", cls: "badge-healthy" },
    };
    const m = map[state] || { label: state, cls: "badge-info" };
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  }

  /** 隔离信息：优先节点上记录的隔离备注，其次最近一次隔离操作备注 */
  function isolateInfoOf(node) {
    if (node.isolateRemark) return node.isolateRemark;
    const ops = MOCK.faultOps || [];
    const last = ops.find((o) => o.node === node.name && o.action === "isolate" && (o.remark || o.reason));
    return (last && (last.remark || last.reason)) || "";
  }

  function alertInfoOf(a) {
    return (a.alertInfo || a.desc || "").trim();
  }

  function faultInfoOf(a) {
    return (a.faultInfo || "").trim();
  }

  function isAlertUnhandled(a) {
    return a && a.status !== "handled" && a.status !== "resolved";
  }

  function alertIdText(a) {
    const id = typeof a === "string" ? a : a?.id || "";
    return String(id).replace(/^ALT-/i, "");
  }

  function alertJobIds(a) {
    const ids = [];
    const push = (id) => {
      const v = String(id || "").trim();
      if (!v || v === "-" || ids.includes(v)) return;
      ids.push(v);
    };
    (Array.isArray(a?.jobs) ? a.jobs : []).forEach(push);
    push(a?.job);
    return ids;
  }

  function lookupJob(id) {
    return (MOCK.jobs || []).find((j) => j.id === id) || null;
  }

  function openJobInNewWindow(jobId) {
    if (!jobId) return;
    try {
      const raw = sessionStorage.getItem(AUTH_KEY);
      if (raw) localStorage.setItem(AUTH_HANDOFF_KEY, raw);
    } catch {
      /* ignore */
    }
    const url = `${location.pathname}${location.search}#job-detail/${encodeURIComponent(jobId)}`;
    const w = window.open(url, "_blank");
    if (!w) {
      toast("浏览器拦截了弹窗，请允许后重试", "warning");
      return;
    }
    toast(`已在新窗口打开任务 ${jobId}`, "info");
  }

  function closeAlertJobs() {
    $("#modal-alert-jobs")?.classList.remove("show");
  }

  function openAlertJobs(alertId) {
    const a = MOCK.alerts.find((x) => x.id === alertId);
    if (!a) {
      toast("未找到告警", "error");
      return;
    }
    const ids = alertJobIds(a);
    if (!ids.length) {
      toast("该告警没有关联任务", "warning");
      return;
    }
    const titleEl = $("#modal-alert-jobs-title");
    if (titleEl) titleEl.textContent = `关联任务（${ids.length}）`;
    const hint = $("#modal-alert-jobs-hint");
    if (hint) {
      hint.textContent = `告警 ID: ${alertIdText(a)} · ${a.title}。点击任务将在新窗口打开详情。`;
    }
    const listEl = $("#modal-alert-jobs-list");
    if (listEl) {
      listEl.innerHTML = ids
        .map((id) => {
          const job = lookupJob(id);
          const name = job?.name || id;
          const status = job ? jobStatusBadge(job) : "";
          const res = job
            ? `<div class="alert-job-item-res">${renderJobResourceCell(job)}</div>`
            : `<div class="alert-job-item-meta">任务记录不在当前列表</div>`;
          return `<button type="button" class="alert-job-item" data-open-job="${escapeHtml(id)}">
            <span class="alert-job-item-main">
              <span class="alert-job-item-name">${escapeHtml(name)} ${status}</span>
              <div class="alert-job-item-id">${escapeHtml(id)}</div>
              ${res}
            </span>
            <span class="alert-job-item-open">新窗口打开 ↗</span>
          </button>`;
        })
        .join("");
      $$("[data-open-job]", listEl).forEach((btn) => {
        btn.addEventListener("click", () => openJobInNewWindow(btn.dataset.openJob));
      });
    }
    $("#modal-alert-jobs")?.classList.add("show");
  }

  function bindAlertJobButtons() {
    $$("[data-alert-jobs]").forEach((b) =>
      b.addEventListener("click", () => openAlertJobs(b.dataset.alertJobs))
    );
  }

  function alertTitleHtml(a, withBadges = true) {
    return `<span class="alert-id"><span class="alert-id-k">ID:</span> ${escapeHtml(alertIdText(a))}</span><span>${escapeHtml(a.title)}</span>${
      withBadges ? `${badge(a.severity)} ${badge(a.status)}` : ""
    }`;
  }

  function alertHandleMetaHtml(a) {
    if (!a || (!a.handleRemark && !a.handledAt && !a.handledBy)) return "";
    const remark = escapeHtml(a.handleRemark || "—");
    const meta = [a.handledBy, a.handledAt].filter(Boolean).map(escapeHtml).join(" · ");
    return `<div class="alert-field"><span class="alert-field-k">处理信息</span><span>${remark}${
      meta ? ` <span class="text-muted">· ${meta}</span>` : ""
    }</span></div>`;
  }

  let pendingAlertHandleIds = [];
  /** 告警中心多选（alert id 集合） */
  let alertSelected = new Set();

  function syncAlertHandleOptions() {
    $$("#modal-alert-handle .alert-handle-option").forEach((opt) => {
      opt.classList.toggle("is-active", !!opt.querySelector("input:checked"));
    });
  }

  function findAlert(id) {
    return (MOCK.alerts || []).find((x) => x.id === id);
  }

  function pruneAlertSelection() {
    const alive = new Set((MOCK.alerts || []).map((a) => a.id));
    alertSelected = new Set([...alertSelected].filter((id) => alive.has(id)));
  }

  function currentAlertPageList() {
    const list = filterAlertsList();
    const pageSize = alertFilters.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize) || 1);
    let page = alertFilters.page || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function syncAlertsBatchBar(pageList) {
    pruneAlertSelection();
    const list = pageList || [];
    const n = alertSelected.size;
    const bar = $("#alerts-batch-bar");
    const countEl = $("#alerts-batch-count");
    if (countEl) countEl.textContent = `已选 ${n} 条`;
    if (bar) {
      if (n > 0) bar.removeAttribute("hidden");
      else bar.setAttribute("hidden", "");
    }
    const checkAll = $("#alerts-check-all");
    if (checkAll) {
      checkAll.disabled = list.length === 0;
      const all = list.length > 0 && list.every((a) => alertSelected.has(a.id));
      const some = list.some((a) => alertSelected.has(a.id));
      checkAll.checked = all;
      checkAll.indeterminate = some && !all;
    }
  }

  function renderAlertHandleTargets(alerts) {
    const el = $("#modal-alert-handle-targets");
    if (!el) return;
    const list = alerts || [];
    if (list.length <= 1) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    const show = list.slice(0, 8);
    const more = list.length - show.length;
    el.innerHTML =
      show
        .map(
          (a) =>
            `<span class="alert-handle-chip"><span class="mono">ID: ${escapeHtml(alertIdText(a))}</span><span class="alert-handle-chip-title">${escapeHtml(
              a.title || "—"
            )}</span></span>`
        )
        .join("") +
      (more > 0 ? `<span class="text-muted" style="font-size:12px">+${more} 条</span>` : "");
    el.hidden = false;
  }

  /**
   * @param {string|string[]} alertIdOrIds
   */
  function openAlertHandle(alertIdOrIds) {
    const ids = [
      ...new Set((Array.isArray(alertIdOrIds) ? alertIdOrIds : [alertIdOrIds]).filter(Boolean)),
    ];
    const alerts = ids.map(findAlert).filter(Boolean);
    if (!alerts.length) {
      toast(ids.length ? "未找到告警" : "请先选择告警", ids.length ? "error" : "warning");
      return;
    }
    pendingAlertHandleIds = alerts.map((a) => a.id);
    const multi = alerts.length > 1;
    const first = alerts[0];
    const titleEl = $("#modal-alert-handle-title");
    const confBtn = $("#modal-alert-handle-confirm");
    if (titleEl) titleEl.textContent = multi ? "批量处理告警" : "处理告警";
    if (confBtn) confBtn.textContent = multi ? `确认处理 ${alerts.length} 条` : "确认处理";
    const sum = $("#modal-alert-handle-summary");
    if (sum) {
      sum.innerHTML = multi
        ? `将以相同状态与备注处理选中的 <strong>${alerts.length}</strong> 条告警`
        : `处理告警 <strong>${escapeHtml(first.title)}</strong>`;
    }
    const idEl = $("#modal-alert-handle-id");
    if (idEl) {
      if (multi) {
        idEl.hidden = true;
        idEl.textContent = "";
      } else {
        idEl.hidden = false;
        idEl.textContent = `ID: ${alertIdText(first)}`;
      }
    }
    renderAlertHandleTargets(alerts);
    const statuses = [...new Set(alerts.map((a) => a.status))];
    const next = statuses.length === 1 && statuses[0] === "handled" ? "handled" : "following";
    $$('#modal-alert-handle input[name="alert-handle-status"]').forEach((inp) => {
      inp.checked = inp.value === next;
    });
    syncAlertHandleOptions();
    const remark = $("#modal-alert-handle-remark");
    if (remark) remark.value = multi ? "" : first.handleRemark || "";
    $("#modal-alert-handle")?.classList.add("show");
    setTimeout(() => $("#modal-alert-handle-remark")?.focus(), 50);
  }

  function closeAlertHandle() {
    pendingAlertHandleIds = [];
    renderAlertHandleTargets([]);
    const idEl = $("#modal-alert-handle-id");
    if (idEl) idEl.hidden = false;
    const confBtn = $("#modal-alert-handle-confirm");
    if (confBtn) confBtn.textContent = "确认处理";
    $("#modal-alert-handle")?.classList.remove("show");
  }

  function confirmAlertHandle() {
    const ids = pendingAlertHandleIds || [];
    if (!ids.length) {
      closeAlertHandle();
      return;
    }
    const statusInp = $('#modal-alert-handle input[name="alert-handle-status"]:checked');
    const next = statusInp?.value;
    if (next !== "following" && next !== "handled") {
      toast("请选择处理状态", "warning");
      return;
    }
    const remark = ($("#modal-alert-handle-remark")?.value || "").trim();
    if (!remark) {
      toast("请填写处理备注", "warning");
      $("#modal-alert-handle-remark")?.focus();
      return;
    }
    const now = "2026-07-27 " + new Date().toTimeString().slice(0, 8);
    const operator = MOCK.user?.name || "当前用户";
    let ok = 0;
    let lastId = "";
    ids.forEach((id) => {
      const a = findAlert(id);
      if (!a) return;
      a.status = next;
      a.handleRemark = remark;
      a.handledAt = now;
      a.handledBy = operator;
      alertSelected.delete(a.id);
      lastId = alertIdText(a);
      ok += 1;
    });
    closeAlertHandle();
    if (!ok) {
      toast("没有可处理的告警", "warning");
      return;
    }
    const doneLabel = next === "handled" ? "已完成" : "跟进中";
    toast(ok > 1 ? `已将 ${ok} 条告警标记为${doneLabel}` : `告警 ID: ${lastId} 已标记为${doneLabel}`);
    updateAlertNavBadge();
    if ($("#page-alerts")?.classList.contains("active")) renderAlerts();
    if ($("#page-job-detail")?.classList.contains("active") && currentJobId) {
      const job = findJob(currentJobId);
      if (job) renderJobAlertsTab(job);
    }
    if ($("#page-dashboard")?.classList.contains("active")) renderDashboard();
  }

  function updateAlertNavBadge() {
    const openCount = MOCK.alerts.filter(isAlertUnhandled).length;
    const badgeEl = $("#nav-alert-badge");
    if (badgeEl) badgeEl.textContent = String(openCount);
  }

  function bindAlertHandleButtons() {
    $$("[data-alert-handle]").forEach((b) =>
      b.addEventListener("click", () => openAlertHandle(b.dataset.alertHandle))
    );
  }

  function bindAlertDetailButtons() {
    $$("[data-alert-detail]").forEach((b) =>
      b.addEventListener("click", () => openAlertDetail(b.dataset.alertDetail))
    );
  }

  function closeAlertDetail() {
    $("#modal-alert-detail")?.classList.remove("show");
  }

  function highlightJsonText(src) {
    const text = String(src ?? "");
    const re =
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b|([{}[\],])/g;
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      out += escapeHtml(text.slice(last, m.index));
      if (m[1]) {
        out += m[2]
          ? `<span class="hl-key">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}`
          : `<span class="hl-str">${escapeHtml(m[1])}</span>`;
      } else if (m[3]) {
        out += `<span class="hl-num">${escapeHtml(m[3])}</span>`;
      } else if (m[4]) {
        out += `<span class="hl-bool">${escapeHtml(m[4])}</span>`;
      } else if (m[5]) {
        out += `<span class="hl-punct">${escapeHtml(m[5])}</span>`;
      }
      last = m.index + m[0].length;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }

  function alertWebhookPayload(a) {
    if (a?.webhookPayload) return a.webhookPayload;
    const node = a.node && a.node !== "-" && a.node !== "multi" ? a.node : "";
    const tags = [
      node ? `instance:${node}` : null,
      node ? `Hostname:${node}` : null,
      ...alertJobIds(a).map((id) => `job:${id}`),
      ...Object.entries(a.labels || {}).map(([k, v]) => `${k}:${v}`),
    ].filter(Boolean);
    const current = a.labels?.temp || a.labels?.util || a.labels?.xid || a.labels?.iface || "1";
    const level = a.severity === "critical" ? 1 : a.severity === "warning" ? 2 : 3;
    return mockFastxWebhookPayload({
      faultName: a.faultInfo || a.title,
      handlingStrategy: "manual",
      name: a.title,
      level,
      firstAlarmTime: a.time ? `${a.time}.0` : null,
      alarmData: [
        ["告警条件", "当前值", "标签"],
        ["> 0", String(current), tags.length ? `${tags.join(",")},` : ""],
      ],
    });
  }

  function alertRawJsonHtml(a) {
    const jsonText = JSON.stringify(alertWebhookPayload(a), null, 2);
    const highlighted = highlightJsonText(jsonText);
    return `
      <div class="alert-raw-block">
        <div class="alert-raw-head">
          <div>
            <div class="alert-raw-title">原始告警内容</div>
            <p class="alert-raw-hint">FastX 通过 Webhook 提交到平台的原始 JSON</p>
          </div>
        </div>
        <pre class="code-block is-hl alert-raw-json" data-lang="json">${highlighted}</pre>
      </div>`;
  }

  function openAlertDetail(alertId) {
    const a = MOCK.alerts.find((x) => x.id === alertId);
    if (!a) {
      toast("未找到告警", "error");
      return;
    }
    const body = $("#modal-alert-detail-body");
    if (body) {
      const labels = Object.entries(a.labels || {})
        .map(([k, v]) => `<span class="tag">${escapeHtml(k)}=${escapeHtml(v)}</span>`)
        .join("") || `<span class="text-muted">—</span>`;
      const handleMeta = [a.handledBy, a.handledAt].filter(Boolean).map(escapeHtml).join(" · ");
      body.innerHTML = `
        <div class="alert-detail-hero">
          <div class="alert-detail-name">${escapeHtml(a.title)}</div>
          <div class="alert-detail-badges">${badge(a.severity)} ${badge(a.status)}</div>
        </div>
        <div class="kv-grid">
          <div class="kv-item"><span class="k">ID</span><span class="v mono">${escapeHtml(alertIdText(a))}</span></div>
          <div class="kv-item"><span class="k">触发时间</span><span class="v mono">${escapeHtml(a.time || "—")}</span></div>
          <div class="kv-item"><span class="k">数据源</span><span class="v">${escapeHtml(a.source || "—")}</span></div>
          <div class="kv-item"><span class="k">节点</span><span class="v mono">${escapeHtml(a.node || "—")}</span></div>
          <div class="kv-item full"><span class="k">关联任务</span><span class="v">${
            alertJobIds(a).length
              ? alertJobIds(a)
                  .map((id) => {
                    const job = lookupJob(id);
                    return `<span class="mono">${escapeHtml(id)}</span>${job ? `（${escapeHtml(job.name)}）` : ""}`;
                  })
                  .join("<br>")
              : "—"
          }</span></div>
          <div class="kv-item full"><span class="k">告警信息</span><span class="v">${escapeHtml(alertInfoOf(a) || "—")}</span></div>
          ${
            faultInfoOf(a)
              ? `<div class="kv-item full"><span class="k">故障信息</span><span class="v text-warning">${escapeHtml(faultInfoOf(a))}</span></div>`
              : ""
          }
          ${
            a.handleRemark || a.handledAt
              ? `<div class="kv-item full"><span class="k">处理信息</span><span class="v">${escapeHtml(a.handleRemark || "—")}${
                  handleMeta ? ` <span class="text-muted">· ${handleMeta}</span>` : ""
                }</span></div>`
              : `<div class="kv-item full"><span class="k">处理信息</span><span class="v text-muted">尚未填写处理备注</span></div>`
          }
          <div class="kv-item full"><span class="k">标签</span><span class="v" style="display:flex;flex-wrap:wrap;gap:6px">${labels}</span></div>
        </div>
        ${alertRawJsonHtml(a)}`;
    }
    $("#modal-alert-detail")?.classList.add("show");
  }

  /** 带故障信息的告警（用于节点管理关联） */
  function faultAlerts() {
    return MOCK.alerts.filter(
      (a) => faultInfoOf(a) && a.node && a.node !== "-" && a.node !== "multi"
    );
  }

  function relatedFaultAlertsForNode(nodeName) {
    return faultAlerts().filter((a) => a.node === nodeName);
  }

  function relatedAlertsForNode(nodeName) {
    return MOCK.alerts.filter((a) => a.node === nodeName);
  }

  function applyCordonFlags(node) {
    // Ready → SchedulingDisabled；NotReady 保留 NotReady，仅打 unschedulable 污点
    if (node.status === "Ready" || node.status === "SchedulingDisabled") {
      node.status = "SchedulingDisabled";
    }
    if (!Array.isArray(node.taints)) node.taints = [];
    if (!node.taints.some((t) => t.key === "node.kubernetes.io/unschedulable")) {
      node.taints.push({ key: "node.kubernetes.io/unschedulable", value: "", effect: "NoSchedule" });
    }
  }

  function applyUncordonFlags(node) {
    if (node.status === "SchedulingDisabled") node.status = "Ready";
    if (Array.isArray(node.taints)) {
      node.taints = node.taints.filter((t) => t.key !== "node.kubernetes.io/unschedulable");
    }
  }

  function applyMaintToNode(node, action, remark, now, operator) {
    if (!node) return;
    if (action === "isolate") {
      node.isolateState = "isolated";
      applyCordonFlags(node);
      node.isolatedAt = now;
      node.isolatedBy = operator;
      node.isolateRemark = remark || "";
      node.note = "节点已隔离（cordon）";
      if (node.gpus) node.gpus = node.gpus.map(() => 3);
      if (!node.labels) node.labels = nodeLabelsOf(node);
      node.labels["maip.io/fault"] = "true";
    } else if (action === "recover") {
      node.isolateState = "healthy";
      applyUncordonFlags(node);
      node.isolatedAt = "-";
      node.isolatedBy = "-";
      node.isolateRemark = "";
      node.note = "节点已重新入池";
      node.ib = "healthy";
      if (node.gpus) node.gpus = node.gpus.map(() => 0);
      if (Array.isArray(node.taints)) {
        node.taints = node.taints.filter(
          (t) => !(t.key === "maip.io/fault" && t.effect === "NoSchedule")
        );
      }
      if (node.labels) {
        delete node.labels["maip.io/fault"];
        delete node.labels["maip.io/maintenance"];
      }
    } else if (action === "cordon") {
      applyCordonFlags(node);
      node.note = remark || "节点已封锁（cordon）";
    } else if (action === "uncordon") {
      applyUncordonFlags(node);
      node.note = remark || "节点已解封（uncordon）";
    }
  }

  /**
   * @param {"isolate"|"recover"|"cordon"|"uncordon"} action
   * @param {string|string[]} nodeNameOrNames
   */
  function openMaintAction(action, nodeNameOrNames) {
    const names = [...new Set((Array.isArray(nodeNameOrNames) ? nodeNameOrNames : [nodeNameOrNames]).filter(Boolean))];
    if (!names.length) {
      toast("请先选择节点", "warning");
      return;
    }
    const label = maintActionLabel(action);
    const applicable = names.filter((name) => {
      const n = findNode(name);
      if (!n) return false;
      if (action === "isolate") return maintStateOf(n) !== "isolated";
      if (action === "recover") return maintStateOf(n) === "isolated";
      if (action === "cordon") return !isNodeCordoned(n);
      if (action === "uncordon") return isNodeCordoned(n);
      return false;
    });
    const skipped = names.length - applicable.length;
    if (!applicable.length) {
      const emptyMsg = {
        isolate: "所选节点均已处于隔离状态，无需再次隔离",
        recover: "所选节点均已可调度，无需入池",
        cordon: "所选节点均已封锁（cordon），无需再次封锁",
        uncordon: "所选节点均未封锁，无需解封",
      };
      toast(emptyMsg[action] || "没有可操作的节点", "warning");
      return;
    }
    pendingMaintAction = { action, nodes: applicable, skipped };
    const multi = applicable.length > 1;
    const titles = {
      isolate: multi ? "确认批量隔离" : "确认节点隔离",
      recover: multi ? "确认批量入池" : "确认节点入池",
      cordon: multi ? "确认批量封锁" : "确认节点封锁",
      uncordon: multi ? "确认批量解封" : "确认节点解封",
    };
    const msgsMulti = {
      isolate: `确定将选中的 <strong>${applicable.length}</strong> 台节点从调度池隔离吗？`,
      recover: `确定将选中的 <strong>${applicable.length}</strong> 台节点重新加入调度吗？`,
      cordon: `确定将选中的 <strong>${applicable.length}</strong> 台节点执行封锁（Cordon）吗？`,
      uncordon: `确定将选中的 <strong>${applicable.length}</strong> 台节点执行解封（Uncordon）吗？`,
    };
    const msgsSingle = (nodeName) => ({
      isolate: `确定将节点 <strong>${escapeHtml(nodeName)}</strong> 从调度池隔离吗？`,
      recover: `确定将节点 <strong>${escapeHtml(nodeName)}</strong> 重新加入调度吗？`,
      cordon: `确定将节点 <strong>${escapeHtml(nodeName)}</strong> 封锁（Cordon）吗？`,
      uncordon: `确定将节点 <strong>${escapeHtml(nodeName)}</strong> 解封（Uncordon）吗？`,
    });
    const skipHints = {
      isolate: `（已跳过 ${skipped} 台已隔离节点）`,
      recover: `（已跳过 ${skipped} 台可调度节点）`,
      cordon: `（已跳过 ${skipped} 台已封锁节点）`,
      uncordon: `（已跳过 ${skipped} 台未封锁节点）`,
    };
    const hints = {
      isolate: "隔离会 cordon 节点并标记故障，之后不再承接新训练任务；运行中任务不会自动迁移，请按需停止或等待结束。",
      recover: "入池前请确认节点已修复并完成验收。系统将 uncordon 并清除故障标记，节点重新参与 Volcano 调度。",
      cordon: "封锁（Cordon）后节点禁止调度新 Pod，不影响已运行任务。不会写入故障隔离标记；故障场景请使用「隔离」。",
      uncordon: "解封（Uncordon）后节点重新允许调度。若节点仍处于故障隔离状态，完整恢复请使用「入池」。",
    };
    const confCls = {
      isolate: "btn btn-danger",
      recover: "btn btn-primary",
      cordon: "btn btn-warning",
      uncordon: "btn btn-primary",
    };
    const hintCls = {
      isolate: "is-danger",
      recover: "is-success",
      cordon: "is-danger",
      uncordon: "is-success",
    };

    $("#modal-maint-title").textContent = titles[action] || `确认${label}`;
    if (multi) {
      $("#modal-maint-msg").innerHTML = msgsMulti[action] || `确定对选中的 <strong>${applicable.length}</strong> 台节点执行${label}吗？`;
      const show = applicable.slice(0, 8);
      const more = applicable.length - show.length;
      let line = show
        .map((name) => {
          const n = findNode(name);
          return n?.ip ? `${name} (${n.ip})` : name;
        })
        .join(" · ");
      if (more > 0) line += ` · +${more} 台`;
      if (skipped > 0) line += skipHints[action] || `（已跳过 ${skipped} 台）`;
      $("#modal-maint-node").textContent = line;
    } else {
      const nodeName = applicable[0];
      const node = findNode(nodeName) || { name: nodeName };
      $("#modal-maint-msg").innerHTML =
        (msgsSingle(nodeName)[action] || `确定对节点 <strong>${escapeHtml(nodeName)}</strong> 执行${label}吗？`);
      $("#modal-maint-node").textContent = node.ip ? `${nodeName} · ${node.ip}` : nodeName;
    }
    const hint = $("#modal-maint-hint");
    if (hint) {
      hint.textContent = hints[action] || "";
      hint.className = `modal-maint-hint ${hintCls[action] || ""}`;
    }
    const remark = $("#modal-maint-remark");
    if (remark) remark.value = "";
    const conf = $("#modal-maint-confirm");
    if (conf) {
      conf.textContent = multi ? `确认${label} ${applicable.length} 台` : `确认${label}`;
      conf.className = confCls[action] || "btn btn-primary";
    }
    $("#modal-maint-action")?.classList.add("show");
    setTimeout(() => $("#modal-maint-remark")?.focus(), 50);
  }

  function closeMaintAction() {
    pendingMaintAction = null;
    const remark = $("#modal-maint-remark");
    if (remark) remark.value = "";
    $("#modal-maint-action")?.classList.remove("show");
  }

  function confirmMaintAction() {
    if (!pendingMaintAction) {
      closeMaintAction();
      return;
    }
    const { action, nodes } = pendingMaintAction;
    const nodeNames = nodes || (pendingMaintAction.node ? [pendingMaintAction.node] : []);
    const now = nowMaintTime();
    const remark = ($("#modal-maint-remark")?.value || "").trim();
    const operator = MOCK.user?.name || "当前用户";
    let ok = 0;
    nodeNames.forEach((nodeName) => {
      const node = findNode(nodeName);
      if (!node) return;
      applyMaintToNode(node, action, remark, now, operator);
      recordNodeMaintOp({
        action,
        node: nodeName,
        operator,
        remark,
        time: now,
      });
      nodeMgmtSelected.delete(nodeName);
      ok += 1;
    });
    closeMaintAction();
    const label = maintActionLabel(action);
    const toastType = action === "isolate" || action === "cordon" ? "warning" : "success";
    toast(
      ok > 1 ? `已${label} ${ok} 台节点` : `节点 ${nodeNames[0]} 已${label}`,
      toastType
    );
    if ($("#page-node-mgmt")?.classList.contains("active")) renderNodeMgmt();
    else if ($("#page-alerts")?.classList.contains("active")) renderAlerts();
  }

  /* ---------- Alerts ---------- */
  /** 告警筛选状态 */
  const alertFilters = {
    severity: "all", // all | critical | warning | info
    status: "all", // all | open | following | handled
    range: "all", // 1h | 6h | 24h | 7d | 30d | all
    q: "",
    page: 1,
    pageSize: 10,
  };

  // 演示用“当前时间”，与 mock 告警日期对齐
  const ALERT_NOW = new Date("2026-07-27T15:00:00");

  function parseAlertTime(t) {
    if (!t) return null;
    const d = new Date(String(t).replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function sortAlertsNewestFirst(list) {
    return [...(list || [])].sort((a, b) => {
      const ta = parseAlertTime(a.time)?.getTime() ?? 0;
      const tb = parseAlertTime(b.time)?.getTime() ?? 0;
      if (tb !== ta) return tb - ta;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
  }

  function rangeToMs(range) {
    const map = {
      "1h": 3600e3,
      "6h": 6 * 3600e3,
      "24h": 24 * 3600e3,
      "7d": 7 * 24 * 3600e3,
      "30d": 30 * 24 * 3600e3,
    };
    return map[range] ?? null;
  }

  function rangeLabel(range) {
    return (
      {
        "1h": "最近 1 小时",
        "6h": "最近 6 小时",
        "24h": "最近 24 小时",
        "7d": "最近 7 天",
        "30d": "最近 30 天",
        all: "全部时间",
      }[range] || range
    );
  }

  function alertsInTimeRange(list, range) {
    if (range === "all") return list;
    const ms = rangeToMs(range);
    if (!ms) return list;
    const from = ALERT_NOW.getTime() - ms;
    return list.filter((a) => {
      const d = parseAlertTime(a.time);
      if (!d) return true;
      return d.getTime() >= from && d.getTime() <= ALERT_NOW.getTime() + 60e3;
    });
  }

  function filterAlertsList() {
    let list = alertsInTimeRange(MOCK.alerts, alertFilters.range);
    if (alertFilters.severity !== "all") {
      list = list.filter((a) => a.severity === alertFilters.severity);
    }
    if (alertFilters.status !== "all") {
      list = list.filter((a) => a.status === alertFilters.status);
    }
    const q = (alertFilters.q || "").trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const blob = [
          a.title,
          alertInfoOf(a),
          faultInfoOf(a),
          a.desc,
          a.id,
          a.job,
          ...(a.jobs || []),
          a.node,
          a.source,
          a.handleRemark,
          a.handledBy,
          ...Object.entries(a.labels || {}).map(([k, v]) => `${k}=${v}`),
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return sortAlertsNewestFirst(list);
  }

  function renderAlertChips() {
    const chip = (group, key, label, active) =>
      `<button type="button" class="alert-chip ${active ? "active" : ""}" data-af-group="${group}" data-af-key="${key}">${label}</button>`;

    const sevEl = $("#alert-sev-chips");
    if (sevEl) {
      sevEl.innerHTML = [
        chip("severity", "all", "全部", alertFilters.severity === "all"),
        chip("severity", "critical", "严重", alertFilters.severity === "critical"),
        chip("severity", "warning", "警告", alertFilters.severity === "warning"),
        chip("severity", "info", "提示", alertFilters.severity === "info"),
      ].join("");
    }

    const stEl = $("#alert-status-chips");
    if (stEl) {
      stEl.innerHTML = [
        chip("status", "all", "全部", alertFilters.status === "all"),
        chip("status", "open", "待处理", alertFilters.status === "open"),
        chip("status", "following", "跟进中", alertFilters.status === "following"),
        chip("status", "handled", "已完成", alertFilters.status === "handled"),
      ].join("");
    }

    const tmEl = $("#alert-time-chips");
    if (tmEl) {
      tmEl.innerHTML = [
        chip("range", "all", "全部", alertFilters.range === "all"),
        chip("range", "1h", "1h", alertFilters.range === "1h"),
        chip("range", "6h", "6h", alertFilters.range === "6h"),
        chip("range", "24h", "24h", alertFilters.range === "24h"),
        chip("range", "7d", "7d", alertFilters.range === "7d"),
        chip("range", "30d", "30d", alertFilters.range === "30d"),
      ].join("");
    }

    $$("#alert-filter-bar [data-af-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = btn.dataset.afGroup;
        const k = btn.dataset.afKey;
        if (g === "severity") alertFilters.severity = k;
        if (g === "status") alertFilters.status = k;
        if (g === "range") alertFilters.range = k;
        alertFilters.page = 1; // 筛选变化重置页码
        renderAlerts();
      });
    });
  }

  function renderAlertPagination(total) {
    return renderPager({
      total,
      page: alertFilters.page,
      pageSize: alertFilters.pageSize || 10,
      key: "alerts",
    });
  }

  function renderAlertKpis() {
    const base = alertsInTimeRange(MOCK.alerts, alertFilters.range);
    const open = base.filter((a) => a.status === "open").length;
    const following = base.filter((a) => a.status === "following").length;
    const handled = base.filter((a) => a.status === "handled").length;
    const crit = base.filter((a) => a.severity === "critical").length;

    const el = $("#alert-kpi-row");
    if (!el) return;
    el.innerHTML = `
      <div class="alert-kpi">
        <div class="alert-kpi-label">待处理</div>
        <div class="alert-kpi-value is-warn">${open}<span> 条</span></div>
      </div>
      <div class="alert-kpi">
        <div class="alert-kpi-label">跟进中</div>
        <div class="alert-kpi-value is-follow">${following}<span> 条</span></div>
      </div>
      <div class="alert-kpi">
        <div class="alert-kpi-label">已完成</div>
        <div class="alert-kpi-value is-ok">${handled}<span> 条</span></div>
      </div>
      <div class="alert-kpi">
        <div class="alert-kpi-label">严重</div>
        <div class="alert-kpi-value is-crit">${crit}<span> 条</span></div>
      </div>`;
  }

  function renderAlerts() {
    const desc = $("#alerts-page-desc");
    if (desc) {
      desc.textContent = `来自 DCGM / IB Exporter / k8s events / Volcano · ${rangeLabel(alertFilters.range)} · 支持批量处理`;
    }

    renderAlertKpis();
    renderAlertChips();

    // keep search input value
    const search = $("#alert-search");
    if (search && search.value !== alertFilters.q) {
      search.value = alertFilters.q;
    }

    const list = filterAlertsList();
    const total = list.length;
    const pageSize = alertFilters.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (alertFilters.page > totalPages) alertFilters.page = totalPages;
    if (alertFilters.page < 1) alertFilters.page = 1;
    const start = (alertFilters.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    $("#alerts-list").innerHTML =
      (pageList.length
        ? pageList
            .map(
              (a) => `
      <div class="alert-item${alertSelected.has(a.id) ? " is-selected" : ""}">
        <label class="alert-item-check">
          <input type="checkbox" class="alert-item-cb" data-alert-check="${escapeHtml(a.id)}" ${
            alertSelected.has(a.id) ? "checked" : ""
          } aria-label="选择告警 ${escapeHtml(alertIdText(a))}" />
        </label>
        <div class="alert-sev ${a.severity}"></div>
        <div class="alert-body">
          <div class="flex-center gap-8" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">
            <div class="alert-title">
              ${alertTitleHtml(a)}
            </div>
            <span class="mono text-muted" style="font-size:11px">${a.time}</span>
          </div>
          <div class="alert-desc">
            <div class="alert-field"><span class="alert-field-k">告警信息</span><span>${escapeHtml(alertInfoOf(a) || "—")}</span></div>
            ${
              faultInfoOf(a)
                ? `<div class="alert-field"><span class="alert-field-k">故障信息</span><span class="text-warning">${escapeHtml(faultInfoOf(a))}</span></div>`
                : ""
            }
            ${alertHandleMetaHtml(a)}
          </div>
          <div class="alert-tags">
            <span class="tag">${escapeHtml(a.source)}</span>
            ${a.node !== "-" ? `<span class="tag">node=${escapeHtml(a.node)}</span>` : ""}
            ${
              alertJobIds(a).length
                ? `<span class="tag">任务 ${alertJobIds(a).length}</span>`
                : ""
            }
            ${
              faultInfoOf(a)
                ? `<span class="tag" style="background:var(--warning-soft);color:#fbbf24">含故障信息</span>`
                : ""
            }
            ${Object.entries(a.labels || {})
              .map(([k, v]) => `<span class="tag">${escapeHtml(k)}=${escapeHtml(v)}</span>`)
              .join("")}
          </div>
          <div class="mt-8 flex gap-8" style="flex-wrap:wrap">
            <button type="button" class="btn btn-primary btn-sm" data-alert-handle="${a.id}">处理告警</button>
            <button type="button" class="btn btn-ghost btn-sm" data-alert-detail="${a.id}">查看详情</button>
            ${
              faultInfoOf(a) && a.node && a.node !== "-" && a.node !== "multi"
                ? `<button class="btn btn-danger btn-sm" data-maint-from-alert="${a.node}">处理节点</button>`
                : ""
            }
            ${
              alertJobIds(a).length
                ? `<button type="button" class="btn btn-ghost btn-sm" data-alert-jobs="${a.id}">查看任务</button>`
                : ""
            }
          </div>
        </div>
      </div>`
            )
            .join("")
        : `<div class="empty-state">没有匹配的告警</div>`) +
      renderAlertPagination(total);

    syncAlertsBatchBar(pageList);
    $$(".alert-item-cb").forEach((cb) =>
      cb.addEventListener("change", () => {
        const id = cb.dataset.alertCheck;
        if (!id) return;
        if (cb.checked) alertSelected.add(id);
        else alertSelected.delete(id);
        renderAlerts();
      })
    );
    bindJobLinks();
    bindAlertHandleButtons();
    bindAlertDetailButtons();
    bindAlertJobButtons();
    $$("[data-maint-from-alert]").forEach((b) =>
      b.addEventListener("click", () => {
        navigate("node-mgmt", { highlightNode: b.dataset.maintFromAlert, tab: "nodes" });
        toast(`已跳转节点管理：${b.dataset.maintFromAlert}`);
      })
    );

    bindPager(
      "alerts",
      () => ({
        page: alertFilters.page,
        pageSize: alertFilters.pageSize || 10,
        total,
      }),
      (p) => {
        alertFilters.page = p;
      },
      (s) => {
        alertFilters.pageSize = s;
      },
      renderAlerts
    );
  }

  /* ---------- Experiments ---------- */
  function filteredExperiments() {
    const statusFilter = $("#exp-filter-status")?.value || "all";
    const ownerFilter = $("#exp-filter-owner")?.value || "all";
    const sort = $("#exp-sort")?.value || "updated_desc";
    const q = ($("#exp-search")?.value || "").toLowerCase().trim();
    let list = [...(MOCK.experiments || [])];

    if (expListState.projectId && expListState.projectId !== "all") {
      list = list.filter((e) => e.projectId === expListState.projectId);
    } else {
      // 全部：隐藏已归档项目下的 runs
      list = list.filter((e) => {
        if (!e.projectId || e.projectId === "-") return true;
        const pr = findProject(e.projectId);
        return !pr || !pr.archived;
      });
    }
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (ownerFilter !== "all") list = list.filter((e) => e.owner === ownerFilter);
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.owner.toLowerCase().includes(q) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (e.project || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sort === "created_desc") return (b.createdAt || "").localeCompare(a.createdAt || "");
      if (sort === "loss_asc") return (a.summary?.train_loss ?? 99) - (b.summary?.train_loss ?? 99);
      if (sort === "loss_desc") return (b.summary?.train_loss ?? 0) - (a.summary?.train_loss ?? 0);
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return list;
  }

  function updateExpCompareBtn() {
    const btn = $("#btn-exp-compare");
    if (!btn) return;
    const n = expListState.selectedIds.size;
    btn.textContent = `TensorBoard 对比 (${n})`;
    btn.disabled = n < 2;
  }

  /* ---------- 实验项目管理 ---------- */
  let editingProjectId = null;
  let pendingArchiveProjectId = null;

  function findProject(id) {
    return (MOCK.experimentProjects || []).find((p) => p.id === id);
  }

  function activeProjects() {
    return (MOCK.experimentProjects || []).filter((p) => !p.archived);
  }

  function archivedProjects() {
    return (MOCK.experimentProjects || []).filter((p) => p.archived);
  }

  function openProjectForm(projectId) {
    editingProjectId = projectId || null;
    const isEdit = !!editingProjectId;
    const p = isEdit ? findProject(editingProjectId) : null;
    const title = $("#modal-proj-title");
    const confirm = $("#modal-proj-confirm");
    if (title) title.textContent = isEdit ? "编辑项目" : "新建项目";
    if (confirm) confirm.textContent = isEdit ? "保存" : "创建项目";
    $("#proj-form-name").value = p?.name || "";
    $("#proj-form-desc").value = p?.desc || "";
    const err = $("#proj-form-error");
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
    if (isEdit) {
      $("#proj-form-name")?.setAttribute("readonly", "readonly");
      $("#proj-form-name")?.classList.add("is-readonly");
    } else {
      $("#proj-form-name")?.removeAttribute("readonly");
      $("#proj-form-name")?.classList.remove("is-readonly");
    }
    $("#modal-proj")?.classList.add("show");
    setTimeout(() => (isEdit ? $("#proj-form-desc") : $("#proj-form-name"))?.focus(), 40);
  }

  function closeProjectForm() {
    editingProjectId = null;
    $("#modal-proj")?.classList.remove("show");
  }

  function slugifyProjectName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u4e00-\u9fa5._-]/g, "")
      .slice(0, 48) || "project";
  }

  function submitProjectForm() {
    const name = ($("#proj-form-name")?.value || "").trim();
    const desc = ($("#proj-form-desc")?.value || "").trim();
    const err = $("#proj-form-error");

    if (!name) {
      if (err) {
        err.textContent = "请填写团队名称";
        err.classList.remove("hidden");
      }
      $("#proj-form-name")?.focus();
      return;
    }
    if (!editingProjectId) {
      const dup = (MOCK.experimentProjects || []).some(
        (p) => !p.archived && p.name.toLowerCase() === name.toLowerCase()
      );
      if (dup) {
        if (err) {
          err.textContent = "已存在同名活跃项目，请换一个名称";
          err.classList.remove("hidden");
        }
        return;
      }
    }

    if (editingProjectId) {
      const p = findProject(editingProjectId);
      if (p) {
        p.desc = desc;
        // 名称只读：与 logdir 项目目录名对齐后避免破坏关联
        toast(`项目已更新：${p.name}`);
      }
    } else {
      const id = `proj-${slugifyProjectName(name)}-${Date.now().toString(36).slice(-4)}`;
      MOCK.experimentProjects.push({
        id,
        name,
        desc,
        archived: false,
        runs: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      expListState.projectId = id;
      expListState.page = 1;
      toast(`项目已创建：${name}`);
    }
    closeProjectForm();
    renderExperiments();
  }

  function openArchiveProject(projectId) {
    const p = findProject(projectId);
    if (!p) return;
    pendingArchiveProjectId = projectId;
    const nameEl = $("#modal-proj-archive-name");
    if (nameEl) nameEl.textContent = p.name;
    $("#modal-proj-archive")?.classList.add("show");
  }

  function closeArchiveProject() {
    pendingArchiveProjectId = null;
    $("#modal-proj-archive")?.classList.remove("show");
  }

  function confirmArchiveProject() {
    const p = findProject(pendingArchiveProjectId);
    if (p) {
      p.archived = true;
      if (expListState.projectId === p.id) {
        expListState.projectId = "all";
      }
      toast(`已归档项目：${p.name}`, "warning");
    }
    closeArchiveProject();
    renderExperiments();
  }

  function restoreProject(projectId) {
    const p = findProject(projectId);
    if (!p) return;
    p.archived = false;
    toast(`已恢复项目：${p.name}`);
    renderArchivedProjectsList();
    renderExperiments();
  }

  function renderArchivedProjectsList() {
    const body = $("#modal-proj-archived-body");
    if (!body) return;
    const list = archivedProjects();
    if (!list.length) {
      body.innerHTML = `<div class="empty-state" style="padding:36px">暂无已归档项目</div>`;
      return;
    }
    body.innerHTML = list
      .map((p) => {
        const count = (MOCK.experiments || []).filter((e) => e.projectId === p.id).length;
        return `<div class="exp-archived-row">
          <div class="meta">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="desc">${escapeHtml(p.desc || "无描述")} · ${count} runs</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-restore-proj="${p.id}">恢复</button>
        </div>`;
      })
      .join("");
    $$("[data-restore-proj]", body).forEach((btn) => {
      btn.addEventListener("click", () => restoreProject(btn.dataset.restoreProj));
    });
  }

  function openArchivedProjects() {
    renderArchivedProjectsList();
    $("#modal-proj-archived-list")?.classList.add("show");
  }

  function closeArchivedProjects() {
    $("#modal-proj-archived-list")?.classList.remove("show");
  }

  function renderExperiments() {
    const projects = activeProjects();
    const allRuns = MOCK.experiments || [];

    // 若当前选中项目已被归档或不存在，回退到全部
    if (expListState.projectId !== "all") {
      const cur = findProject(expListState.projectId);
      if (!cur || cur.archived) expListState.projectId = "all";
    }

    // 项目侧栏
    const projList = $("#exp-project-list");
    if (projList) {
      // 「全部」统计：活跃项目下的 runs；无 project 关联的也计入
      const allVisibleCount = allRuns.filter((e) => {
        if (!e.projectId || e.projectId === "-") return true;
        const pr = findProject(e.projectId);
        return !pr || !pr.archived;
      }).length;

      projList.innerHTML =
        `<div class="exp-project-item ${expListState.projectId === "all" ? "active" : ""}" data-proj="all">
          <div class="exp-proj-body">
            <span class="exp-proj-name">全部项目</span>
            <span class="exp-proj-meta">${allVisibleCount} runs</span>
          </div>
        </div>` +
        projects
          .map((p) => {
            const count = allRuns.filter((e) => e.projectId === p.id).length;
            return `<div class="exp-project-item ${expListState.projectId === p.id ? "active" : ""}" data-proj="${p.id}">
              <div class="exp-proj-body">
                <span class="exp-proj-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
                <span class="exp-proj-meta">${count} runs${p.desc ? " · " + escapeHtml(p.desc) : ""}</span>
              </div>
              <div class="exp-proj-actions">
                <button type="button" class="exp-proj-action" data-edit-proj="${p.id}" title="编辑项目">✎</button>
                <button type="button" class="exp-proj-action danger" data-archive-proj="${p.id}" title="归档项目">⊘</button>
              </div>
            </div>`;
          })
          .join("") +
        (projects.length === 0
          ? `<div class="empty-state" style="padding:20px 8px;font-size:12px">暂无团队，点击上方「新建」创建</div>`
          : "");

      $$("[data-proj]", projList).forEach((el) => {
        el.addEventListener("click", (ev) => {
          if (ev.target.closest("[data-edit-proj], [data-archive-proj]")) return;
          expListState.projectId = el.dataset.proj;
          expListState.page = 1;
          renderExperiments();
        });
      });
      $$("[data-edit-proj]", projList).forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openProjectForm(btn.dataset.editProj);
        });
      });
      $$("[data-archive-proj]", projList).forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openArchiveProject(btn.dataset.archiveProj);
        });
      });
    }

    // owner 下拉
    const ownerSel = $("#exp-filter-owner");
    if (ownerSel && ownerSel.options.length <= 1) {
      const owners = [...new Set(allRuns.map((e) => e.owner))].sort();
      owners.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        ownerSel.appendChild(opt);
      });
    }

    const list = filteredExperiments();
    const running = list.filter((e) => e.status === "running").length;
    const finished = list.filter((e) => e.status === "finished").length;
    const failed = list.filter((e) => e.status === "failed" || e.status === "crashed").length;
    const bestLoss = list
      .map((e) => e.summary?.best_val_loss ?? e.summary?.val_loss)
      .filter((v) => v != null)
      .sort((a, b) => a - b)[0];

    const kpi = $("#exp-kpi-row");
    if (kpi) {
      kpi.innerHTML = `
        <div class="exp-kpi"><div class="label">当前筛选 Runs</div><div class="value">${list.length}</div><div class="meta">项目内可见实验</div></div>
        <div class="exp-kpi"><div class="label">运行中</div><div class="value" style="color:var(--info)">${running}</div><div class="meta">实时上报指标</div></div>
        <div class="exp-kpi"><div class="label">已完成</div><div class="value" style="color:var(--success)">${finished}</div><div class="meta">失败/中止 ${failed}</div></div>
        <div class="exp-kpi"><div class="label">最佳 Val Loss</div><div class="value mono" style="font-size:20px">${bestLoss != null ? formatExpMetric(bestLoss) : "—"}</div><div class="meta">当前筛选集合</div></div>
      `;
    }

    const total = list.length;
    const pageSize = expListState.pageSize || 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (expListState.page > totalPages) expListState.page = totalPages;
    if (expListState.page < 1) expListState.page = 1;
    const start = (expListState.page - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);

    const tbody = $("#exp-tbody");
    if (tbody) {
      tbody.innerHTML = pageList.length
        ? pageList
            .map((e) => {
              const checked = expListState.selectedIds.has(e.id) ? "checked" : "";
              const selCls = expListState.selectedIds.has(e.id) ? "exp-row-selected" : "";
              const tags = (e.tags || [])
                .slice(0, 2)
                .map((t, i) => `<span class="exp-tag ${i === 0 ? "highlight" : ""}">${escapeHtml(t)}</span>`)
                .join("");
              const jobShort =
                e.jobId && e.jobId !== "-"
                  ? e.jobId.replace(/^job-/, "")
                  : "";
              const jobCell =
                e.jobId && e.jobId !== "-"
                  ? `<span class="link-cell exp-job-link" data-job="${e.jobId}" style="cursor:pointer" title="${escapeHtml(e.jobId)}">${escapeHtml(jobShort)}</span>`
                  : `<span class="text-muted">—</span>`;
              const stepText =
                e.summary?.step != null
                  ? e.summary.max_steps
                    ? `${formatStepNum(e.summary.step)}/${formatStepNum(e.summary.max_steps)}`
                    : formatStepNum(e.summary.step)
                  : "—";
              const updated = (e.updatedAt || e.createdAt || "").replace(/^\d{4}-/, "");
              return `<tr class="${selCls}" data-exp-row="${e.id}">
                <td class="exp-col-check"><input type="checkbox" class="exp-check" data-exp-id="${e.id}" ${checked} /></td>
                <td class="exp-name-cell">
                  <div class="link-cell exp-run-name" data-exp="${e.id}" style="cursor:pointer" title="${escapeHtml(e.name)}">${escapeHtml(e.name)}</div>
                  <div class="exp-run-meta">
                    <span class="text-muted" title="${escapeHtml(e.project || "")}">${escapeHtml(e.project || "—")}</span>
                    ${tags ? `<span class="exp-tags">${tags}</span>` : ""}
                  </div>
                </td>
                <td class="exp-col-status">${expStatusBadge(e.status)}</td>
                <td class="exp-col-loss">
                  <div class="exp-metric" title="Train Loss">${formatExpMetric(e.summary?.train_loss)}</div>
                  <div class="exp-metric-sub text-muted" title="Val Loss">val ${formatExpMetric(e.summary?.val_loss)}</div>
                </td>
                <td class="exp-col-step mono" title="step">${stepText}</td>
                <td class="exp-col-tps exp-metric" title="tokens/s">${formatExpMetric(e.summary?.tokens_per_sec, "tokens_per_sec")}</td>
                <td class="exp-col-job">${jobCell}</td>
                <td class="exp-col-owner">
                  <div class="exp-owner-name">${escapeHtml(e.owner)}</div>
                  <div class="mono text-muted exp-owner-time">${escapeHtml(updated)}</div>
                </td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="8"><div class="empty-state">没有匹配的实验</div></td></tr>`;
    }

    const pagerEl = $("#exp-pagination");
    if (pagerEl) {
      pagerEl.innerHTML = renderPager({
        total,
        page: expListState.page,
        pageSize,
        key: "exp",
      });
      bindPager(
        "exp",
        () => ({ page: expListState.page, pageSize: expListState.pageSize, total }),
        (p) => {
          expListState.page = p;
        },
        (s) => {
          expListState.pageSize = s;
        },
        renderExperiments
      );
    }

    // bindings
    $$("[data-exp]").forEach((el) => {
      el.addEventListener("click", () => goExpDetail(el.dataset.exp));
    });
    $$(".exp-check").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.dataset.expId;
        if (cb.checked) {
          if (expListState.selectedIds.size >= 5) {
            cb.checked = false;
            toast("最多同时对比 5 个实验", "warning");
            return;
          }
          expListState.selectedIds.add(id);
        } else {
          expListState.selectedIds.delete(id);
        }
        updateExpCompareBtn();
        // row highlight
        const row = cb.closest("tr");
        row?.classList.toggle("exp-row-selected", cb.checked);
      });
    });
    const checkAll = $("#exp-check-all");
    if (checkAll) {
      checkAll.checked =
        pageList.length > 0 && pageList.every((e) => expListState.selectedIds.has(e.id));
      checkAll.onchange = () => {
        pageList.forEach((e) => {
          if (checkAll.checked) {
            if (expListState.selectedIds.size < 5) expListState.selectedIds.add(e.id);
          } else {
            expListState.selectedIds.delete(e.id);
          }
        });
        renderExperiments();
      };
    }
    updateExpCompareBtn();
    bindJobLinks();
  }

  function renderExpMetricChart(exp, metricKey, label, color, unit) {
    const m = exp.metrics || {};
    const values = m[metricKey] || [];
    if (!values.length) {
      return `<div class="exp-chart-card"><h4>${label}</h4><div class="empty-state" style="padding:32px">无该指标数据</div></div>`;
    }
    const steps = m.steps || values.map((_, i) => i + 1);
    const xLabels = {};
    [0, Math.floor((values.length - 1) / 2), values.length - 1].forEach((i) => {
      if (steps[i] != null) xLabels[i] = String(steps[i]);
    });
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const pad = (dataMax - dataMin) * 0.12 || Math.abs(dataMax) * 0.05 || 0.1;
    let yMin = dataMin - pad;
    let yMax = dataMax + pad;
    if (metricKey === "lr") {
      yMin = 0;
      yMax = dataMax * 1.15 || 1e-4;
    }
    if (metricKey.includes("mem")) {
      yMin = Math.max(0, dataMin - 2);
    }
    // lineChart 使用固定 time axis；实验用 multiLineChart 更贴合 step
    const chart = multiLineChart({
      series: [{ name: label, values, color, fill: true }],
      w: 520,
      h: 220,
      unit: unit || "",
      yMin,
      yMax,
      xLabels,
    });
    const last = values[values.length - 1];
    return `<div class="exp-chart-card">
      <h4>${label}</h4>
      <div class="exp-chart-sub">最新 ${formatExpMetric(last, metricKey)}${unit ? " " + unit : ""} · step ${steps[steps.length - 1]?.toLocaleString?.() || steps[steps.length - 1] || "—"}</div>
      ${chart}
    </div>`;
  }

  function renderExpDetail() {
    const exp = findExperiment(currentExpId);
    if (!exp) {
      $("#exp-detail-hero").innerHTML = `<div class="empty-state">未找到实验 ${escapeHtml(currentExpId || "")}</div>`;
      return;
    }

    const tags = (exp.tags || [])
      .map((t) => `<span class="exp-tag highlight">${escapeHtml(t)}</span>`)
      .join(" ");
    const jobLink =
      exp.jobId && exp.jobId !== "-"
        ? `<button class="btn btn-ghost btn-sm" data-job="${exp.jobId}">查看任务 ${exp.jobId}</button>`
        : "";

    $("#exp-detail-hero").innerHTML = `
      <div class="detail-hero-top">
        <div>
          <h2>${escapeHtml(exp.name)} ${expStatusBadge(exp.status)}</h2>
          <div class="mono text-muted mt-8" style="font-size:12px">${exp.id} · 项目 ${escapeHtml(exp.project)}</div>
          <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">${tags}</div>
          ${
            exp.notes
              ? `<div style="margin-top:10px;font-size:13px;color:var(--text-2);line-height:1.5">${escapeHtml(exp.notes)}</div>`
              : ""
          }
        </div>
        <div class="page-actions">
          ${jobLink}
          <button class="btn btn-primary btn-sm" id="btn-exp-open-tb">打开 TensorBoard</button>
          <button class="btn btn-secondary btn-sm" id="btn-exp-add-compare">加入对比</button>
        </div>
      </div>
      <div class="detail-meta">
        <div class="meta-item"><div class="label">创建人</div><div class="value">${escapeHtml(exp.owner)}</div></div>
        <div class="meta-item"><div class="label">Train Loss</div><div class="value mono">${formatExpMetric(exp.summary?.train_loss)}</div></div>
        <div class="meta-item"><div class="label">Val / Best</div><div class="value mono">${formatExpMetric(exp.summary?.val_loss)} / ${formatExpMetric(exp.summary?.best_val_loss)}</div></div>
        <div class="meta-item"><div class="label">Step</div><div class="value mono">${
          exp.summary?.step != null
            ? `${exp.summary.step.toLocaleString()}${exp.summary.max_steps ? " / " + exp.summary.max_steps.toLocaleString() : ""}`
            : "—"
        }</div></div>
        <div class="meta-item"><div class="label">吞吐</div><div class="value mono">${formatExpMetric(exp.summary?.tokens_per_sec, "tokens_per_sec")} tok/s</div></div>
        <div class="meta-item"><div class="label">资源</div><div class="value">${exp.gpus} GPU · ${escapeHtml(exp.framework || "—")}</div></div>
        <div class="meta-item"><div class="label">时长</div><div class="value mono">${exp.duration || "—"}</div></div>
        <div class="meta-item"><div class="label">更新时间</div><div class="value mono">${exp.updatedAt || exp.createdAt}</div></div>
      </div>
    `;

    const openTensorBoardForExp = (e) => {
      const logdir = e.tbLogdir || "";
      toast(`按需启动 TensorBoard 代理 · logdir=${logdir}`, "info");
    };
    $("#btn-exp-open-tb")?.addEventListener("click", () => openTensorBoardForExp(exp));
    $("#btn-exp-add-compare")?.addEventListener("click", () => {
      expListState.selectedIds.add(exp.id);
      if (expListState.selectedIds.size >= 2) {
        navigate("exp-compare");
      } else {
        toast("已加入对比，请再选至少 1 个实验", "info");
        navigate("experiments");
      }
    });
    bindJobLinks();

    const metricDefs = [
      { key: "train_loss", label: "Train Loss", color: "#22d3ee", unit: "" },
      { key: "val_loss", label: "Val Loss", color: "#a78bfa", unit: "" },
      { key: "lr", label: "Learning Rate", color: "#f59e0b", unit: "" },
      { key: "tokens_per_sec", label: "Tokens / sec", color: "#22c55e", unit: "" },
      { key: "grad_norm", label: "Grad Norm", color: "#f472b6", unit: "" },
      { key: "gpu_mem_gb", label: "GPU Memory", color: "#60a5fa", unit: "GB" },
    ];

    const renderChartsPanel = () => {
      const selected = expListState.chartMetrics;
      const chips = metricDefs
        .map(
          (m) =>
            `<button type="button" class="exp-metric-chip ${selected.includes(m.key) ? "active" : ""}" data-metric-chip="${m.key}">${m.label}</button>`
        )
        .join("");
      const cards = metricDefs
        .filter((m) => selected.includes(m.key))
        .map((m) => renderExpMetricChart(exp, m.key, m.label, m.color, m.unit))
        .join("");
      const chartsEl = $("#panel-exp-charts");
      const logdir = exp.tbLogdir || "—";
      chartsEl.innerHTML = `
        <div class="exp-tb-embed">
          <div class="exp-tb-embed-main">
            <div class="exp-tb-badge">主路径</div>
            <h4>TensorBoard 看板</h4>
            <p class="text-muted">完整 Scalars / Histograms / HParams 等由 TensorBoard 提供。平台按需启动进程并反向代理，训练侧 <code>SummaryWriter</code> 写入约定 logdir。</p>
            ${codeBlockHtml(logdir, "path", "exp-tb-logdir")}
            <div class="exp-tb-embed-actions">
              <button type="button" class="btn btn-primary btn-sm" id="btn-tb-launch">打开 / 嵌入 TensorBoard</button>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-tb-cmd">复制 tensorboard 命令</button>
            </div>
          </div>
          <div class="exp-tb-embed-side">
            <div class="kv-list">
              <div class="kv-row"><span class="k">状态</span><span class="v"><span class="status running"><span class="status-dot"></span>可按需启动</span></span></div>
              <div class="kv-row"><span class="k">Provider</span><span class="v mono">tensorboard</span></div>
              <div class="kv-row"><span class="k">写入约定</span><span class="v">仅 rank0 写 events</span></div>
              <div class="kv-row"><span class="k">鉴权</span><span class="v">平台代理 + 路径 ACL</span></div>
            </div>
          </div>
        </div>
        <div class="exp-charts-toolbar">
          <div class="exp-metric-chips">${chips}</div>
          <span class="text-muted" style="font-size:12px">下方为平台示意预览 · 完整曲线请使用 TensorBoard</span>
        </div>
        <div class="exp-charts-grid">${cards || `<div class="empty-state">请至少选择一个指标</div>`}</div>
      `;
      bindMultiCharts(chartsEl);
      $("#btn-tb-launch")?.addEventListener("click", () => openTensorBoardForExp(exp));
      $("#btn-tb-cmd")?.addEventListener("click", () => {
        const cmd = `tensorboard --logdir ${logdir} --bind_all`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(cmd).then(
            () => toast("已复制 tensorboard 命令"),
            () => toast(cmd, "info")
          );
        } else {
          toast(cmd, "info");
        }
      });
      $$("[data-metric-chip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const k = btn.dataset.metricChip;
          const idx = expListState.chartMetrics.indexOf(k);
          if (idx >= 0) {
            if (expListState.chartMetrics.length <= 1) {
              toast("至少保留一个指标", "warning");
              return;
            }
            expListState.chartMetrics.splice(idx, 1);
          } else {
            expListState.chartMetrics.push(k);
          }
          renderChartsPanel();
        });
      });
    };

    const renderConfigPanel = () => {
      const cfg = exp.config || {};
      const groups = {
        "模型与并行": ["model", "tp", "pp", "dp", "bf16", "seq_len"],
        "优化器与学习率": ["optimizer", "lr", "min_lr", "lr_scheduler", "warmup_steps", "weight_decay"],
        "数据与 Batch": ["dataset", "global_batch", "micro_batch", "seed"],
      };
      const groupHtml = Object.entries(groups)
        .map(([title, keys]) => {
          const rows = keys
            .filter((k) => cfg[k] != null)
            .map(
              (k) =>
                `<div class="kv-row"><span class="k">${k}</span><span class="v mono">${escapeHtml(String(cfg[k]))}</span></div>`
            )
            .join("");
          return `<div class="exp-config-card"><h4>${title}</h4><div class="card-body"><div class="kv-list">${rows || '<div class="text-muted" style="padding:12px">无</div>'}</div></div></div>`;
        })
        .join("");
      // 其余 key
      const known = new Set(Object.values(groups).flat());
      const extra = Object.keys(cfg).filter((k) => !known.has(k));
      const extraHtml = extra.length
        ? `<div class="exp-config-card"><h4>其他</h4><div class="card-body"><div class="kv-list">${extra
            .map(
              (k) =>
                `<div class="kv-row"><span class="k">${k}</span><span class="v mono">${escapeHtml(String(cfg[k]))}</span></div>`
            )
            .join("")}</div></div></div>`
        : "";
      $("#panel-exp-config").innerHTML = `<div class="exp-config-grid">${groupHtml}${extraHtml}</div>`;
    };

    const renderArtifactsPanel = () => {
      const arts = exp.artifacts || [];
      $("#panel-exp-artifacts").innerHTML = arts.length
        ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>名称</th><th>类型</th><th>Step</th><th>大小</th><th>路径</th></tr></thead>
            <tbody>${arts
              .map(
                (a) => `<tr>
                  <td><strong>${escapeHtml(a.name)}</strong></td>
                  <td><span class="exp-tag">${escapeHtml(a.type)}</span></td>
                  <td class="mono">${a.step != null ? a.step.toLocaleString() : "—"}</td>
                  <td class="mono">${escapeHtml(a.size || "—")}</td>
                  <td class="mono text-muted" style="font-size:12px;max-width:360px;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(a.path)}">${escapeHtml(a.path)}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table></div>`
        : `<div class="empty-state">暂无产物 / Checkpoint</div>`;
    };

    const renderSystemPanel = () => {
      const sysEl = $("#panel-exp-system");
      sysEl.innerHTML = `
        <div class="exp-panel-note text-muted">
          此处为训练过程中写入 TensorBoard 的辅助标量示意（如吞吐、grad norm）。节点 GPU / IB 等基础设施指标见关联任务的「任务监控」。
        </div>
        <div class="exp-charts-grid">
          ${renderExpMetricChart(exp, "gpu_mem_gb", "GPU Memory (GB)", "#60a5fa", "GB")}
          ${renderExpMetricChart(exp, "grad_norm", "Grad Norm", "#f472b6", "")}
          ${renderExpMetricChart(exp, "tokens_per_sec", "Throughput", "#22c55e", "")}
        </div>`;
      bindMultiCharts(sysEl);
    };

    const renderOverviewPanel = () => {
      const logdir = exp.tbLogdir || "—";
      $("#panel-exp-overview").innerHTML = `
        <div class="exp-config-grid">
          <div class="exp-config-card">
            <h4>关联信息</h4>
            <div class="card-body">
              <div class="kv-list">
                <div class="kv-row"><span class="k">实验 ID</span><span class="v mono">${exp.id}</span></div>
                <div class="kv-row"><span class="k">项目</span><span class="v">${escapeHtml(exp.project)}</span></div>
                <div class="kv-row"><span class="k">训练任务</span><span class="v">${
                  exp.jobId && exp.jobId !== "-"
                    ? `<span class="link-cell" data-job="${exp.jobId}" style="cursor:pointer">${exp.jobId}</span>`
                    : "—"
                }</span></div>
                <div class="kv-row"><span class="k">框架</span><span class="v">${escapeHtml(exp.framework || "—")}</span></div>
                <div class="kv-row"><span class="k">GPU 数</span><span class="v">${exp.gpus}</span></div>
                <div class="kv-row"><span class="k">创建时间</span><span class="v mono">${exp.createdAt}</span></div>
                <div class="kv-row"><span class="k">更新时间</span><span class="v mono">${exp.updatedAt}</span></div>
              </div>
            </div>
          </div>
          <div class="exp-config-card">
            <h4>TensorBoard logdir</h4>
            <div class="card-body">
              <p class="text-muted" style="font-size:12.5px;margin-bottom:10px;line-height:1.55">
                平台启动任务时注入 <code>TENSORBOARD_LOGDIR</code>；训练代码通过
                <code>torch.utils.tensorboard.SummaryWriter</code>（或框架内置 TB）写入
                <code>events.out.tfevents.*</code>。看板由平台按需启动并代理，不在平台内重做完整 Scalars UI。
              </p>
              ${codeBlockHtml(logdir, "path")}
              <div style="margin-top:12px" class="flex gap-8">
                <button class="btn btn-secondary btn-sm" id="btn-copy-tb-logdir">复制 logdir</button>
                <button class="btn btn-ghost btn-sm" id="btn-tb-cmd-overview">tensorboard 命令</button>
                <button class="btn btn-primary btn-sm" id="btn-tb-open-overview">打开 TensorBoard</button>
              </div>
            </div>
          </div>
        </div>`;
      bindJobLinks();
      $("#btn-copy-tb-logdir")?.addEventListener("click", () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(logdir).then(
            () => toast("已复制 TensorBoard logdir"),
            () => toast(logdir, "info")
          );
        } else {
          toast(logdir, "info");
        }
      });
      $("#btn-tb-cmd-overview")?.addEventListener("click", () => {
        toast(`tensorboard --logdir ${logdir} --bind_all`, "info");
      });
      $("#btn-tb-open-overview")?.addEventListener("click", () => openTensorBoardForExp(exp));
    };

    initTabs("#exp-detail-tabs", "#exp-detail-panels", (tab) => {
      if (tab === "charts") renderChartsPanel();
      if (tab === "config") renderConfigPanel();
      if (tab === "artifacts") renderArtifactsPanel();
      if (tab === "system") renderSystemPanel();
      if (tab === "overview") renderOverviewPanel();
      location.hash = `exp-detail/${exp.id}/${tab}`;
    });

    // 默认 charts；支持深链
    const hashParts = location.hash.replace(/^#/, "").split("/");
    const deepTab = hashParts[0] === "exp-detail" ? hashParts[2] : "";
    const tabs = $$("#exp-detail-tabs .tab");
    const panels = $$("#exp-detail-panels .tab-panel");
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    const target = deepTab && $(`#exp-detail-tabs .tab[data-tab="${deepTab}"]`) ? deepTab : "charts";
    $(`#exp-detail-tabs .tab[data-tab="${target}"]`)?.classList.add("active");
    $(`#exp-detail-panels .tab-panel[data-panel="${target}"]`)?.classList.add("active");
    if (target === "charts") renderChartsPanel();
    else if (target === "config") renderConfigPanel();
    else if (target === "artifacts") renderArtifactsPanel();
    else if (target === "system") renderSystemPanel();
    else renderOverviewPanel();
  }

  function renderExpCompare() {
    const ids = [...expListState.selectedIds];
    // hash 恢复
    const hash = location.hash.replace(/^#/, "");
    if (hash.startsWith("exp-compare/") && ids.length < 2) {
      hash
        .split("/")[1]
        ?.split(",")
        .filter(Boolean)
        .forEach((id) => expListState.selectedIds.add(id));
    }
    const selected = [...expListState.selectedIds]
      .map((id) => findExperiment(id))
      .filter(Boolean)
      .slice(0, 5);

    if (selected.length < 2) {
      $("#exp-compare-body").innerHTML = `
        <div class="card"><div class="card-body empty-state" style="padding:48px">
          请至少选择 2 个实验，在 TensorBoard 中对比多 Run。
          <div style="margin-top:16px"><button class="btn btn-primary" id="btn-compare-goto-list">返回实验列表</button></div>
        </div></div>`;
      $("#btn-compare-goto-list")?.addEventListener("click", () => navigate("experiments"));
      return;
    }

    const desc = $("#exp-compare-desc");
    if (desc) {
      desc.textContent = `正在对比 ${selected.length} 个实验 · 主路径：TensorBoard 多 logdir · 辅：超参 Diff / 示意曲线`;
    }

    const chips = selected
      .map(
        (e, i) =>
          `<div class="exp-compare-chip"><span class="swatch" style="background:${EXP_COMPARE_COLORS[i % EXP_COMPARE_COLORS.length]}"></span>
            <strong>${escapeHtml(e.name)}</strong>
            <span class="text-muted mono" style="font-size:11px">${e.id}</span>
            ${expStatusBadge(e.status)}
          </div>`
      )
      .join("");

    // config keys union
    const allKeys = [...new Set(selected.flatMap((e) => Object.keys(e.config || {})))].sort();
    const diffRows = allKeys
      .map((k) => {
        const vals = selected.map((e) => e.config?.[k]);
        const same = vals.every((v) => String(v) === String(vals[0]));
        return `<tr>
          <td class="mono" style="font-weight:500">${escapeHtml(k)}</td>
          ${vals
            .map(
              (v) =>
                `<td class="mono ${same ? "diff-same" : "diff-diff"}">${v == null ? "—" : escapeHtml(String(v))}</td>`
            )
            .join("")}
        </tr>`;
      })
      .join("");

    // summary table
    const summaryKeys = [
      ["train_loss", "Train Loss"],
      ["val_loss", "Val Loss"],
      ["best_val_loss", "Best Val Loss"],
      ["step", "Step"],
      ["tokens_per_sec", "Tokens/s"],
      ["gpus", "GPUs"],
      ["duration", "时长"],
    ];
    const summaryRows = summaryKeys
      .map(([k, label]) => {
        return `<tr>
          <td>${label}</td>
          ${selected
            .map((e) => {
              const v = k === "gpus" || k === "duration" ? e[k] : e.summary?.[k];
              const text =
                k === "tokens_per_sec"
                  ? formatExpMetric(v, "tokens_per_sec")
                  : k === "gpus" || k === "duration" || k === "step"
                  ? v != null
                    ? String(typeof v === "number" ? v.toLocaleString() : v)
                    : "—"
                  : formatExpMetric(v, k);
              return `<td class="mono exp-metric">${text}</td>`;
            })
            .join("")}
        </tr>`;
      })
      .join("");

    // overlay charts — align by index (demo); resample shorter series
    function padSeries(values, n) {
      if (!values?.length) return Array(n).fill(null);
      if (values.length === n) return values;
      // 线性重采样到 n 点
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        const src = t * (values.length - 1);
        const lo = Math.floor(src);
        const hi = Math.min(values.length - 1, lo + 1);
        const f = src - lo;
        out.push(+(values[lo] * (1 - f) + values[hi] * f).toFixed(4));
      }
      return out;
    }

    const metricCharts = [
      { key: "train_loss", label: "Train Loss", unit: "" },
      { key: "val_loss", label: "Val Loss", unit: "" },
      { key: "lr", label: "Learning Rate", unit: "" },
      { key: "tokens_per_sec", label: "Tokens / sec", unit: "" },
    ]
      .map((m) => {
        const maxN = Math.max(...selected.map((e) => (e.metrics?.[m.key] || []).length), 1);
        const series = selected
          .map((e, i) => {
            const raw = e.metrics?.[m.key] || [];
            if (!raw.length) return null;
            return {
              name: e.name,
              values: padSeries(raw, maxN),
              color: EXP_COMPARE_COLORS[i % EXP_COMPARE_COLORS.length],
            };
          })
          .filter(Boolean);
        if (!series.length) {
          return `<div class="exp-chart-card"><h4>${m.label}</h4><div class="empty-state">无数据</div></div>`;
        }
        const allVals = series.flatMap((s) => s.values.filter((v) => v != null));
        const dataMin = Math.min(...allVals);
        const dataMax = Math.max(...allVals);
        const pad = (dataMax - dataMin) * 0.12 || 0.1;
        const chart = multiLineChart({
          series,
          w: 560,
          h: 240,
          unit: m.unit,
          yMin: m.key === "lr" ? 0 : dataMin - pad,
          yMax: dataMax + pad,
          xLabels: { 0: "start", [Math.floor((maxN - 1) / 2)]: "mid", [maxN - 1]: "end" },
        });
        return `<div class="exp-chart-card"><h4>${m.label}</h4><div class="exp-chart-sub">曲线已按索引对齐重采样（演示）</div>${chart}</div>`;
      })
      .join("");

    const logdirList = selected
      .map(
        (e, i) =>
          `<div class="exp-tb-logdir-row">
            <span class="swatch" style="background:${EXP_COMPARE_COLORS[i % EXP_COMPARE_COLORS.length]}"></span>
            <strong>${escapeHtml(e.name)}</strong>
            <code class="mono">${escapeHtml(e.tbLogdir || "—")}</code>
          </div>`
      )
      .join("");

    const compareBody = $("#exp-compare-body");
    compareBody.innerHTML = `
      <div class="exp-compare-runs">${chips}</div>

      <div class="card exp-compare-section exp-tb-compare-card">
        <div class="card-header">
          <h3>在 TensorBoard 中对比</h3>
          <span class="exp-tb-badge">主路径</span>
        </div>
        <div class="card-body">
          <p class="text-muted" style="font-size:12.5px;line-height:1.55;margin:0 0 12px">
            平台将选中 Run 的 logdir 一并挂载，按需启动 TensorBoard（多 Run 原生叠加）。完整曲线、HParams 插件等以看板为准；下方超参 Diff 与示意曲线为平台辅助视图。
          </p>
          <div class="exp-tb-logdir-list">${logdirList}</div>
          <div class="exp-tb-embed-actions" style="margin-top:14px">
            <button type="button" class="btn btn-primary" id="btn-tb-compare-open">打开 TensorBoard 对比</button>
            <button type="button" class="btn btn-secondary" id="btn-tb-compare-cmd">复制多 logdir 命令</button>
          </div>
        </div>
      </div>

      <div class="card exp-compare-section">
        <div class="card-header"><h3>指标摘要</h3><span class="text-muted" style="font-size:12px">平台侧 summary</span></div>
        <div class="card-body flush">
          <div class="table-wrap">
            <table class="table exp-diff-table">
              <thead>
                <tr>
                  <th>指标</th>
                  ${selected.map((e, i) => `<th class="run-col"><span class="swatch" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${EXP_COMPARE_COLORS[i]};margin-right:6px"></span>${escapeHtml(e.name)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>${summaryRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card exp-compare-section">
        <div class="card-header"><h3>超参 Diff</h3><span class="text-muted" style="font-size:12px">高亮 = 存在差异 · 平台辅助</span></div>
        <div class="card-body flush">
          <div class="table-wrap">
            <table class="table exp-diff-table">
              <thead>
                <tr>
                  <th>参数</th>
                  ${selected.map((e) => `<th class="run-col">${escapeHtml(e.name)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>${diffRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card exp-compare-section">
        <div class="card-header"><h3>指标曲线叠加（示意）</h3><span class="text-muted" style="font-size:12px">完整对比请用 TensorBoard</span></div>
        <div class="exp-charts-grid">${metricCharts}</div>
      </div>
    `;
    bindMultiCharts(compareBody);

    const openTbCompare = () => {
      const dirs = selected.map((e) => e.tbLogdir).filter(Boolean);
      toast(`按需启动 TensorBoard 多 Run 对比 · ${dirs.length} 个 logdir`, "info");
    };
    $("#btn-tb-compare-open")?.addEventListener("click", openTbCompare);
    $("#btn-tb-compare-cmd")?.addEventListener("click", () => {
      // 演示：用逗号分隔的伪 multi-logdir；实际可映射到父目录或 --logdir_spec
      const dirs = selected.map((e) => e.tbLogdir).filter(Boolean);
      const spec = selected
        .map((e) => `${e.name}:${e.tbLogdir}`)
        .filter((s) => !s.endsWith(":undefined") && !s.endsWith(":"))
        .join(",");
      const cmd = spec
        ? `tensorboard --logdir_spec ${spec} --bind_all`
        : `tensorboard --logdir ${dirs[0] || "."} --bind_all`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(cmd).then(
          () => toast("已复制 TensorBoard 多 Run 命令"),
          () => toast(cmd, "info")
        );
      } else {
        toast(cmd, "info");
      }
    });
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function langFromPath(path) {
    const p = String(path || "").toLowerCase();
    if (/\.(ya?ml)$/.test(p)) return "yaml";
    if (/\.json$/.test(p)) return "json";
    if (/\.(sh|bash)$/.test(p)) return "shell";
    if (/\.env$/.test(p)) return "env";
    return "yaml";
  }

  function highlightSource(src, lang) {
    const text = String(src ?? "");
    const fn =
      lang === "shell"
        ? tokenizeShell
        : lang === "env"
          ? tokenizeEnv
          : lang === "diff"
            ? tokenizeDiff
            : lang === "json"
              ? tokenizeJson
              : lang === "path"
                ? tokenizePath
                : tokenizeYaml;
    return fn(text)
      .map((t) => (t.type ? `<span class="hl-${t.type}">${escapeHtml(t.text)}</span>` : escapeHtml(t.text)))
      .join("");
  }

  function codeBlockHtml(source, lang, extraClass, attrs) {
    const cls = ["code-block", "is-hl", extraClass].filter(Boolean).join(" ");
    const extra = attrs ? ` ${attrs}` : "";
    return `<pre class="${cls}" data-lang="${escapeHtml(lang || "text")}"${extra}>${highlightSource(source, lang)}</pre>`;
  }

  function flushTokens(tokens, type, buf) {
    if (!buf.length) return;
    tokens.push(type ? { type, text: buf } : { text: buf });
  }

  function tokenizeYamlValue(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      if (s[i] === "#") {
        tokens.push({ type: "comment", text: s.slice(i) });
        break;
      }
      if (s[i] === '"' || s[i] === "'") {
        const q = s[i];
        let j = i + 1;
        while (j < s.length && s[j] !== q) {
          if (s[j] === "\\" && j + 1 < s.length) j += 2;
          else j += 1;
        }
        tokens.push({ type: "str", text: s.slice(i, Math.min(s.length, j + 1)) });
        i = j + 1;
        continue;
      }
      if (/[0-9]/.test(s[i]) || (s[i] === "-" && /[0-9.]/.test(s[i + 1] || ""))) {
        const m = s.slice(i).match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
        tokens.push({ type: "num", text: m[0] });
        i += m[0].length;
        continue;
      }
      if (/[{}[\]:,]/.test(s[i])) {
        tokens.push({ type: "punct", text: s[i] });
        i += 1;
        continue;
      }
      if (/\s/.test(s[i])) {
        const m = s.slice(i).match(/^\s+/);
        tokens.push({ text: m[0] });
        i += m[0].length;
        continue;
      }
      const m = s.slice(i).match(/^[^\s#{}[\]:,]+/);
      const w = m[0];
      const lw = w.toLowerCase();
      const type = ["true", "false", "null", "yes", "no", "~"].includes(lw) ? "bool" : "str";
      tokens.push({ type, text: w });
      i += w.length;
    }
    return tokens;
  }

  function tokenizeYaml(src) {
    const tokens = [];
    String(src).split("\n").forEach((line, idx) => {
      if (idx) tokens.push({ text: "\n" });
      if (/^\s*#/.test(line)) {
        const lead = line.match(/^\s*/)[0];
        if (lead) tokens.push({ text: lead });
        tokens.push({ type: "comment", text: line.slice(lead.length) });
        return;
      }
      if (/^\s*---\s/.test(line) || line.trim() === "---" || line.trim() === "...") {
        tokens.push({ type: "meta", text: line });
        return;
      }
      const kv = line.match(/^(\s*)(- )?(?:"([^"]+)"|'([^']+)'|([A-Za-z_][\w./-]*))(\s*)(:)(\s*)(.*)$/);
      if (kv) {
        if (kv[1]) tokens.push({ text: kv[1] });
        if (kv[2]) tokens.push({ type: "punct", text: kv[2] });
        tokens.push({ type: "key", text: kv[3] || kv[4] || kv[5] });
        if (kv[6]) tokens.push({ text: kv[6] });
        tokens.push({ type: "punct", text: kv[7] });
        if (kv[8]) tokens.push({ text: kv[8] });
        tokens.push(...tokenizeYamlValue(kv[9]));
        return;
      }
      const li = line.match(/^(\s*)(- )(.*)$/);
      if (li) {
        if (li[1]) tokens.push({ text: li[1] });
        tokens.push({ type: "punct", text: li[2] });
        tokens.push(...tokenizeYamlValue(li[3]));
        return;
      }
      tokens.push(...tokenizeYamlValue(line));
    });
    return tokens;
  }

  function tokenizeJson(src) {
    return tokenizeYamlValue(String(src));
  }

  function tokenizeEnv(src) {
    const tokens = [];
    String(src).split("\n").forEach((line, idx) => {
      if (idx) tokens.push({ text: "\n" });
      if (/^\s*#/.test(line) || !line.trim()) {
        if (/^\s*#/.test(line)) tokens.push({ type: "comment", text: line });
        else tokens.push({ text: line });
        return;
      }
      const eq = line.indexOf("=");
      if (eq < 1) {
        tokens.push({ text: line });
        return;
      }
      tokens.push({ type: "key", text: line.slice(0, eq) });
      tokens.push({ type: "punct", text: "=" });
      tokens.push({ type: "str", text: line.slice(eq + 1) });
    });
    return tokens;
  }

  function tokenizeDiff(src) {
    const tokens = [];
    String(src).split("\n").forEach((line, idx) => {
      if (idx) tokens.push({ text: "\n" });
      if (/^(---|\+\+\+|@@)/.test(line)) tokens.push({ type: "meta", text: line });
      else if (line.startsWith("+")) tokens.push({ type: "add", text: line });
      else if (line.startsWith("-")) tokens.push({ type: "del", text: line });
      else tokens.push({ text: line });
    });
    return tokens;
  }

  function tokenizePath(src) {
    const tokens = [];
    String(src).split("\n").forEach((line, idx) => {
      if (idx) tokens.push({ text: "\n" });
      const hash = line.indexOf("#");
      if (hash >= 0) {
        const left = line.slice(0, hash);
        if (left) tokens.push({ type: /\/[^\s]*/.test(left) ? "path" : null, text: left });
        tokens.push({ type: "comment", text: line.slice(hash) });
      } else if (/^\/\S+/.test(line.trim()) || line.includes("/")) {
        tokens.push({ type: "path", text: line });
      } else {
        tokens.push({ text: line });
      }
    });
    return tokens;
  }

  function tokenizeShellInterpolations(word, fallbackType) {
    const tokens = [];
    const fallback = fallbackType || "str";
    let i = 0;
    const text = String(word || "");
    while (i < text.length) {
      if (text[i] === "$") {
        const m = text.slice(i).match(/^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/);
        if (m) {
          tokens.push({ type: "var", text: m[0] });
          i += m[0].length;
          continue;
        }
      }
      let j = i + 1;
      while (j < text.length && text[j] !== "$") j += 1;
      tokens.push({ type: fallback, text: text.slice(i, j) });
      i = j;
    }
    return tokens;
  }

  function tokenizeShell(src) {
    const tokens = [];
    String(src).split("\n").forEach((line, idx) => {
      if (idx) tokens.push({ text: "\n" });
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        tokens.push({ type: "comment", text: line });
        return;
      }
      let i = 0;
      let cmdPending = true;
      while (i < line.length) {
        const rest = line.slice(i);
        if (rest.startsWith("\\") && i === line.length - 1) {
          tokens.push({ type: "punct", text: "\\" });
          i += 1;
          continue;
        }
        if (line[i] === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
          tokens.push({ type: "comment", text: line.slice(i) });
          break;
        }
        if (line[i] === '"' || line[i] === "'") {
          const q = line[i];
          let j = i + 1;
          while (j < line.length && line[j] !== q) {
            if (line[j] === "\\" && j + 1 < line.length) j += 2;
            else j += 1;
          }
          tokens.push({ type: "str", text: line.slice(i, Math.min(line.length, j + 1)) });
          i = j + 1;
          cmdPending = false;
          continue;
        }
        if (line[i] === "$") {
          const m = rest.match(/^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/);
          tokens.push({ type: "var", text: m[0] });
          i += m[0].length;
          cmdPending = false;
          continue;
        }
        if (rest.startsWith("--") || (line[i] === "-" && /[A-Za-z]/.test(line[i + 1] || ""))) {
          const m = rest.match(/^--?[\w-]+(?:=[^\s]+)?/);
          const eq = m[0].indexOf("=");
          if (eq >= 0) {
            tokens.push({ type: "flag", text: m[0].slice(0, eq + 1) });
            tokenizeShellInterpolations(m[0].slice(eq + 1)).forEach((t) => tokens.push(t));
          } else {
            tokens.push({ type: "flag", text: m[0] });
          }
          i += m[0].length;
          cmdPending = false;
          continue;
        }
        if (line[i] === "/" || rest.startsWith("./") || rest.startsWith("../")) {
          const m = rest.match(/^[^\s]+/);
          tokens.push({ type: "path", text: m[0] });
          i += m[0].length;
          cmdPending = false;
          continue;
        }
        if (/\s/.test(line[i])) {
          const m = rest.match(/^\s+/);
          tokens.push({ text: m[0] });
          i += m[0].length;
          continue;
        }
        const m = rest.match(/^[^\s]+/);
        const word = m[0];
        if (cmdPending && !word.endsWith("=") && word !== "\\") {
          tokens.push({ type: "cmd", text: word });
          cmdPending = false;
        } else {
          tokens.push({ type: word.includes("/") ? "path" : "str", text: word });
        }
        i += word.length;
      }
    });
    return tokens;
  }

  function bindCodeEditor(textarea, hlEl, lang) {
    if (!textarea || !hlEl) return;
    const sync = () => {
      hlEl.innerHTML = `${highlightSource(textarea.value, lang || "text")}\n`;
    };
    if (textarea.dataset.hlBound !== "1") {
      textarea.dataset.hlBound = "1";
      textarea.addEventListener("scroll", () => {
        hlEl.scrollTop = textarea.scrollTop;
        hlEl.scrollLeft = textarea.scrollLeft;
      });
      textarea.addEventListener("input", sync);
    }
    sync();
  }

  function bindYamlEditor(textarea, hlEl) {
    bindCodeEditor(textarea, hlEl, "yaml");
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function routeFromHash() {
    if (!getAuth() && !restoreSessionIfValid()) {
      showLoginScreen();
      return;
    }
    let hash = location.hash.replace("#", "");
    if (!hash || hash === "login") {
      navigate(getDefaultHomePage());
      return;
    }
    // 兼容旧 hash：节点维护 → 节点管理
    if (hash === "maintenance" || hash.startsWith("maintenance/")) {
      hash = "node-mgmt";
    }
    if (hash.startsWith("job-detail/")) {
      const parts = hash.split("/");
      currentJobId = parts[1] || currentJobId;
      navigate("job-detail");
    } else if (hash.startsWith("job-create/rerun/")) {
      rerunFromJobId = hash.split("/")[2] || null;
      navigate("job-create");
    } else if (hash === "job-create") {
      goCreateJob();
    } else if (hash.startsWith("exp-detail/")) {
      const parts = hash.split("/");
      currentExpId = parts[1] || currentExpId;
      navigate("exp-detail");
    } else if (hash.startsWith("exp-compare")) {
      const ids = (hash.split("/")[1] || "").split(",").filter(Boolean);
      ids.forEach((id) => expListState.selectedIds.add(id));
      navigate("exp-compare");
    } else if (hash.startsWith("config-detail/")) {
      currentConfigSetId = hash.split("/")[1] || currentConfigSetId;
      navigate("config-detail");
    } else if (hash.startsWith("config-edit/")) {
      currentConfigSetId = hash.split("/")[1] || null;
      configEditIsNew = false;
      navigate("config-edit");
    } else if (hash === "config-edit") {
      configEditIsNew = true;
      currentConfigSetId = null;
      navigate("config-edit");
    } else if (hash && $(`#page-${hash}`)) {
      navigate(hash);
    } else {
      navigate(getDefaultHomePage());
    }
  }

  /**
   * 表单「?」提示 + 失败状态标签：挂到 body 固定层，避免被 modal / overflow 裁切
   */
  function initFieldHelpTooltips() {
    let tipEl = null;
    let activeBtn = null;
    let hideTimer = null;
    const TRIGGER_SEL = ".field-help, .badge-has-tip";

    function triggerFrom(target) {
      return target?.closest?.(TRIGGER_SEL) || null;
    }

    function ensureTipEl() {
      if (tipEl && document.body.contains(tipEl)) return tipEl;
      tipEl = document.createElement("div");
      tipEl.className = "field-help-floating-tip";
      tipEl.setAttribute("role", "tooltip");
      document.body.appendChild(tipEl);
      return tipEl;
    }

    function positionTip(btn) {
      const el = ensureTipEl();
      const rect = btn.getBoundingClientRect();
      const gap = 8;
      const tipW = el.offsetWidth || 200;
      const tipH = el.offsetHeight || 40;
      const isFail = btn.classList.contains("badge-has-tip");

      let left;
      if (isFail) {
        // 与状态标签左对齐并向右展开，避免挡住任务名
        left = rect.left;
      } else {
        left = rect.left + rect.width / 2 - tipW / 2;
      }
      left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12));

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      // 表单「?」仍优先上方；失败标签在表格内优先下方，减少遮挡表头
      const placeBelow = isFail
        ? spaceBelow >= tipH + gap + 8 || spaceBelow >= spaceAbove
        : spaceAbove < tipH + gap + 8;
      let top = placeBelow ? rect.bottom + gap : rect.top - tipH - gap;
      top = Math.max(8, Math.min(top, window.innerHeight - tipH - 8));

      el.style.left = `${Math.round(left)}px`;
      el.style.top = `${Math.round(top)}px`;
      el.classList.toggle("is-below", placeBelow);
    }

    function showTip(btn) {
      if (!btn) return;
      const isFail = btn.classList.contains("badge-has-tip");
      const text = (btn.getAttribute("data-tip") || (!isFail && btn.getAttribute("aria-label")) || "").trim();
      if (!text) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (activeBtn && activeBtn !== btn) activeBtn.classList.remove("is-open");
      activeBtn = btn;
      btn.classList.add("is-open");
      const el = ensureTipEl();
      if (isFail) {
        el.innerHTML = `<div class="hover-tip-k">失败原因</div><div class="hover-tip-v">${escapeHtml(text)}</div>`;
        el.classList.add("is-fail");
      } else {
        el.classList.remove("is-fail");
        el.textContent = text;
      }
      el.classList.add("is-visible");
      // 先显示再量尺寸定位
      positionTip(btn);
      requestAnimationFrame(() => positionTip(btn));
    }

    function hideTip(immediate) {
      const run = () => {
        const el = ensureTipEl();
        el.classList.remove("is-visible", "is-below", "is-fail");
        if (activeBtn) activeBtn.classList.remove("is-open");
        activeBtn = null;
        hideTimer = null;
      };
      if (immediate) {
        if (hideTimer) clearTimeout(hideTimer);
        run();
        return;
      }
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(run, 80);
    }

    document.addEventListener(
      "mouseover",
      (e) => {
        const btn = triggerFrom(e.target);
        if (btn) showTip(btn);
      },
      true
    );
    document.addEventListener(
      "mouseout",
      (e) => {
        const btn = triggerFrom(e.target);
        if (!btn) return;
        const to = e.relatedTarget;
        if (to && (btn === to || btn.contains(to))) return;
        hideTip(false);
      },
      true
    );
    document.addEventListener(
      "focusin",
      (e) => {
        const btn = triggerFrom(e.target);
        if (btn) showTip(btn);
      },
      true
    );
    document.addEventListener(
      "focusout",
      (e) => {
        const btn = triggerFrom(e.target);
        if (btn) hideTip(false);
      },
      true
    );
    window.addEventListener(
      "scroll",
      () => {
        if (activeBtn) positionTip(activeBtn);
        else hideTip(true);
      },
      true
    );
    window.addEventListener("resize", () => {
      if (activeBtn) positionTip(activeBtn);
    });
    // 打开/关闭弹窗时收起，避免残留
    document.addEventListener("click", (e) => {
      if (!triggerFrom(e.target)) hideTip(true);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    initTheme();
    initSidebarCollapse();
    initClusterSelect();
    $("#cluster-select")?.addEventListener("change", (e) => {
      const id = e.target.value;
      if (!id) return;
      // 与当前相同则忽略；否则弹二次确认（取消时还原选择器）
      if (id === getCurrentClusterId()) return;
      openClusterSwitchConfirm(id);
    });
    $("#modal-cluster-switch-confirm")?.addEventListener("click", confirmClusterSwitch);
    $("#modal-cluster-switch-cancel")?.addEventListener("click", closeClusterSwitchConfirm);
    $("#modal-cluster-switch-close")?.addEventListener("click", closeClusterSwitchConfirm);
    $("#modal-cluster-switch")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cluster-switch")) closeClusterSwitchConfirm();
    });

    initFieldHelpTooltips();

    // 登录方式切换：LDAP / 平台管理员
    $$("#login-mode-tabs .login-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const mode = tab.dataset.mode === "admin" ? "admin" : "ldap";
        if (mode === loginMode) return;
        setLoginMode(mode);
      });
    });
    // 演示账号提示
    $("#login-demo-tip-toggle")?.addEventListener("click", toggleLoginDemoTip);
    // 初始同步一次文案（默认 LDAP）
    setLoginMode(loginMode, { clearError: true, focus: false });

    // 登录表单
    $("#login-form")?.addEventListener("submit", handleLoginSubmit);
    $("#login-toggle-pwd")?.addEventListener("click", () => {
      const input = $("#login-password");
      const btn = $("#login-toggle-pwd");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      if (btn) btn.textContent = show ? "隐藏" : "显示";
    });
    $("#sidebar-user")?.addEventListener("click", toggleSidebarUserMenu);
    $("#btn-logout")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openLogoutConfirm();
    });
    $("#modal-logout-confirm")?.addEventListener("click", handleLogout);
    $("#modal-logout-cancel")?.addEventListener("click", closeLogoutConfirm);
    $("#modal-logout-close")?.addEventListener("click", closeLogoutConfirm);
    $("#modal-logout")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-logout")) closeLogoutConfirm();
    });
    document.addEventListener("click", (e) => {
      const wrap = $("#sidebar-user-wrap");
      if (!wrap || wrap.classList.contains("is-open") === false) return;
      if (!wrap.contains(e.target)) closeSidebarUserMenu();
    });

    // 会话恢复：仅当平台用户仍存在且启用
    if (restoreSessionIfValid()) {
      showAppShell();
      routeFromHash();
    } else {
      showLoginScreen();
      location.hash = "login";
    }

    // nav — 侧栏进入创建任务时重置为「新建」
    $$(".nav-item[data-page]").forEach((item) => {
      item.addEventListener("click", () => {
        if (item.dataset.page === "job-create") {
          goCreateJob();
        } else {
          // 离开创建页时不强制清 rerun；进入其他页可清
          if (item.dataset.page !== "job-create") rerunFromJobId = null;
          navigate(item.dataset.page);
        }
      });
    });

    $("#btn-create-job")?.addEventListener("click", (e) => {
      e.preventDefault();
      goCreateJob();
    });
    $("#btn-submit-job")?.addEventListener("click", submitJob);
    $$("#create-form-tabs [data-create-tab]").forEach((el) => {
      el.addEventListener("click", () => switchCreateFormTab(el.dataset.createTab, { scroll: true }));
    });
    window.addEventListener("scroll", () => {
      syncCreateFormTabFromScroll();
      syncConfigEditTabFromScroll();
    }, { passive: true });
    $("#btn-cancel-create")?.addEventListener("click", () => {
      rerunFromJobId = null;
      navigate("jobs");
    });
    $("#create-run-user-search")?.addEventListener("focus", () => {
      if (!$("#create-run-user-search")?.readOnly) {
        renderCreateRunUserResults($("#create-run-user-search")?.value || "");
      }
    });
    $("#create-run-user-search")?.addEventListener("input", (e) => {
      if ($("#create-run-user-search")?.readOnly) return;
      if ($("#create-run-user")?.value) {
        $("#create-run-user").value = "";
        $("#create-run-user-selected")?.classList.add("hidden");
        $("#create-run-user-clear")?.classList.add("hidden");
        syncCreateRunUserHint();
        syncDefaultWorkdir();
        syncCreateWorkdirHelp();
        updateCreateSummary();
      }
      renderCreateRunUserResults(e.target.value || "");
    });
    $("#create-run-user-clear")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyCreateRunUser(null);
      $("#create-run-user-search")?.focus();
      renderCreateRunUserResults("");
    });
    document.addEventListener("click", (e) => {
      const picker = $("#create-run-user-picker");
      if (!picker || picker.contains(e.target)) return;
      $("#create-run-user-results")?.classList.add("hidden");
    });

    $("#modal-cfg-del-file-confirm")?.addEventListener("click", confirmConfigFileDelete);
    $("#modal-cfg-del-file-cancel")?.addEventListener("click", closeConfigFileDeleteConfirm);
    $("#modal-cfg-del-file-close")?.addEventListener("click", closeConfigFileDeleteConfirm);
    $("#modal-cfg-del-file")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cfg-del-file")) closeConfigFileDeleteConfirm();
    });
    $("#modal-cfg-unmount-confirm")?.addEventListener("click", confirmUnmount);
    $("#modal-cfg-unmount-cancel")?.addEventListener("click", closeUnmountConfirm);
    $("#modal-cfg-unmount-close")?.addEventListener("click", closeUnmountConfirm);
    $("#modal-cfg-unmount")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cfg-unmount")) closeUnmountConfirm();
    });
    $("#modal-cfg-archive-confirm")?.addEventListener("click", confirmConfigArchive);
    $("#modal-cfg-archive-cancel")?.addEventListener("click", closeConfigArchiveModal);
    $("#modal-cfg-archive-close")?.addEventListener("click", closeConfigArchiveModal);
    $("#modal-cfg-archive")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cfg-archive")) closeConfigArchiveModal();
    });
    $("#modal-cfg-dirty-leave")?.addEventListener("click", confirmConfigDirtyLeave);
    $("#modal-cfg-dirty-cancel")?.addEventListener("click", () => {
      pendingConfigDirtyLeave = null;
      closeConfigDirtyModal();
    });
    $("#modal-cfg-dirty-close")?.addEventListener("click", () => {
      pendingConfigDirtyLeave = null;
      closeConfigDirtyModal();
    });
    $("#modal-cfg-dirty")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cfg-dirty")) {
        pendingConfigDirtyLeave = null;
        closeConfigDirtyModal();
      }
    });
    $("#modal-cfg-diff-cancel")?.addEventListener("click", closeConfigDiffModal);
    $("#modal-cfg-diff-close")?.addEventListener("click", closeConfigDiffModal);
    $("#modal-cfg-diff")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cfg-diff")) closeConfigDiffModal();
    });

    $("#job-filter-status")?.addEventListener("change", () => {
      jobListState.page = 1;
      renderJobs();
    });
    $("#job-filter-priority")?.addEventListener("change", () => {
      jobListState.priority = $("#job-filter-priority")?.value || "all";
      jobListState.page = 1;
      renderJobs();
    });
    $("#job-filter-team")?.addEventListener("change", () => {
      jobListState.teamId = $("#job-filter-team")?.value || "all";
      // 切换团队时重置队列筛选，避免选中不在该团队下的队列
      jobListState.queueId = "all";
      jobListState.page = 1;
      renderJobs();
    });
    $("#job-filter-queue")?.addEventListener("change", () => {
      jobListState.queueId = $("#job-filter-queue")?.value || "all";
      jobListState.page = 1;
      renderJobs();
    });
    $("#job-search")?.addEventListener("input", () => {
      jobListState.page = 1;
      renderJobs();
    });

    // 告警中心：搜索
    $("#alert-search")?.addEventListener("input", (e) => {
      alertFilters.q = e.target.value || "";
      alertFilters.page = 1;
      renderAlerts();
    });
    $("#alerts-check-all")?.addEventListener("change", () => {
      const pageList = currentAlertPageList();
      const on = !!$("#alerts-check-all")?.checked;
      pageList.forEach((a) => {
        if (on) alertSelected.add(a.id);
        else alertSelected.delete(a.id);
      });
      renderAlerts();
    });
    $("#btn-alert-batch-handle")?.addEventListener("click", () => {
      openAlertHandle([...alertSelected]);
    });
    $("#btn-alert-batch-clear")?.addEventListener("click", () => {
      alertSelected = new Set();
      renderAlerts();
    });

    // 停止任务二次确认
    $("#modal-stop-confirm")?.addEventListener("click", confirmStopJob);
    $("#modal-stop-cancel")?.addEventListener("click", closeStopJobConfirm);
    $("#modal-stop-close")?.addEventListener("click", closeStopJobConfirm);
    $("#modal-stop-job")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-stop-job")) closeStopJobConfirm();
    });

    // 节点隔离 / 入池确认
    $("#modal-maint-confirm")?.addEventListener("click", confirmMaintAction);
    $("#modal-maint-cancel")?.addEventListener("click", closeMaintAction);
    $("#modal-maint-close")?.addEventListener("click", closeMaintAction);
    $("#modal-maint-action")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-maint-action")) closeMaintAction();
    });
    $("#modal-alert-detail-cancel")?.addEventListener("click", closeAlertDetail);
    $("#modal-alert-detail-close")?.addEventListener("click", closeAlertDetail);
    $("#modal-alert-detail")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-alert-detail")) closeAlertDetail();
    });
    $("#modal-alert-jobs-cancel")?.addEventListener("click", closeAlertJobs);
    $("#modal-alert-jobs-close")?.addEventListener("click", closeAlertJobs);
    $("#modal-alert-jobs")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-alert-jobs")) closeAlertJobs();
    });
    // 处理告警
    $("#modal-alert-handle-confirm")?.addEventListener("click", confirmAlertHandle);
    $("#modal-alert-handle-cancel")?.addEventListener("click", closeAlertHandle);
    $("#modal-alert-handle-close")?.addEventListener("click", closeAlertHandle);
    $("#modal-alert-handle")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-alert-handle")) closeAlertHandle();
    });
    $$("#modal-alert-handle input[name='alert-handle-status']").forEach((inp) => {
      inp.addEventListener("change", syncAlertHandleOptions);
    });
    $$("#modal-alert-handle .alert-handle-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const inp = opt.querySelector("input");
        if (inp) inp.checked = true;
        syncAlertHandleOptions();
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#modal-stop-job")?.classList.contains("show")) {
        closeStopJobConfirm();
      }
      if (e.key === "Escape" && $("#modal-maint-action")?.classList.contains("show")) {
        closeMaintAction();
      }
      if (e.key === "Escape" && $("#modal-alert-detail")?.classList.contains("show")) {
        closeAlertDetail();
      }
      if (e.key === "Escape" && $("#modal-alert-handle")?.classList.contains("show")) {
        closeAlertHandle();
      }
      if (e.key === "Escape" && $("#modal-alert-jobs")?.classList.contains("show")) {
        closeAlertJobs();
      }
      if (e.key === "Escape" && $("#modal-proj")?.classList.contains("show")) {
        closeProjectForm();
      }
      if (e.key === "Escape" && $("#modal-proj-archive")?.classList.contains("show")) {
        closeArchiveProject();
      }
      if (e.key === "Escape" && $("#modal-proj-archived-list")?.classList.contains("show")) {
        closeArchivedProjects();
      }
      if (e.key === "Escape" && $("#modal-queue")?.classList.contains("show")) {
        closeQueueForm();
      }
      if (e.key === "Escape" && $("#modal-team")?.classList.contains("show")) {
        closeTeamForm();
      }
      if (e.key === "Escape" && $("#modal-team-member")?.classList.contains("show")) {
        closeTeamMemberModal();
      }
      if (e.key === "Escape" && $("#modal-team-queue")?.classList.contains("show")) {
        closeTeamQueueModal();
      }
      if (e.key === "Escape" && $("#modal-user-ldap")?.classList.contains("show")) {
        closeUserLdapModal();
      }
      if (e.key === "Escape" && $("#modal-user-role")?.classList.contains("show")) {
        closeUserRoleModal();
      }
      if (e.key === "Escape" && $("#modal-role-rename")?.classList.contains("show")) {
        closeRoleRenameModal();
      }
      if (e.key === "Escape" && $("#modal-user-action")?.classList.contains("show")) {
        closeUserActionConfirm();
      }
      if (e.key === "Escape" && $("#modal-queue-action")?.classList.contains("show")) {
        closeQueueActionConfirm();
      }
      if (e.key === "Escape" && $("#modal-cluster-action")?.classList.contains("show")) {
        closeClusterDeleteConfirm();
      }
      if (e.key === "Escape" && $("#sidebar-user-wrap")?.classList.contains("is-open")) {
        closeSidebarUserMenu();
      }
      if (e.key === "Escape" && $("#modal-cluster-switch")?.classList.contains("show")) {
        closeClusterSwitchConfirm();
        return;
      }
      if (e.key === "Escape" && $("#modal-logout")?.classList.contains("show")) {
        closeLogoutConfirm();
      }
    });

    // 实验筛选
    $("#exp-filter-status")?.addEventListener("change", () => {
      expListState.page = 1;
      renderExperiments();
    });
    $("#exp-filter-owner")?.addEventListener("change", () => {
      expListState.page = 1;
      renderExperiments();
    });
    $("#exp-sort")?.addEventListener("change", () => {
      expListState.page = 1;
      renderExperiments();
    });
    $("#exp-search")?.addEventListener("input", () => {
      expListState.page = 1;
      renderExperiments();
    });
    $("#btn-exp-compare")?.addEventListener("click", () => {
      if (expListState.selectedIds.size < 2) {
        toast("请至少勾选 2 个实验", "warning");
        return;
      }
      navigate("exp-compare");
    });
    $("#btn-exp-compare-back")?.addEventListener("click", () => navigate("experiments"));
    $("#btn-exp-docs")?.addEventListener("click", () => {
      toast(
        "接入：镜像预置 tensorboard；训练侧 SummaryWriter 写入 logdir；平台注入 TENSORBOARD_LOGDIR=outputs/{job_id}/tensorboard，按需启动并代理看板，关联 job_id",
        "info"
      );
    });

    // 实验项目管理（TensorBoard logdir 分组）
    $("#btn-proj-create")?.addEventListener("click", () => openProjectForm(null));
    $("#btn-proj-archived")?.addEventListener("click", openArchivedProjects);
    $("#modal-proj-confirm")?.addEventListener("click", submitProjectForm);
    $("#modal-proj-cancel")?.addEventListener("click", closeProjectForm);
    $("#modal-proj-close")?.addEventListener("click", closeProjectForm);
    $("#modal-proj")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-proj")) closeProjectForm();
    });
    $("#modal-proj-archive-confirm")?.addEventListener("click", confirmArchiveProject);
    $("#modal-proj-archive-cancel")?.addEventListener("click", closeArchiveProject);
    $("#modal-proj-archive-close")?.addEventListener("click", closeArchiveProject);
    $("#modal-proj-archive")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-proj-archive")) closeArchiveProject();
    });
    $("#modal-proj-archived-cancel")?.addEventListener("click", closeArchivedProjects);
    $("#modal-proj-archived-close")?.addEventListener("click", closeArchivedProjects);
    $("#modal-proj-archived-list")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-proj-archived-list")) closeArchivedProjects();
    });
    $("#proj-form-name")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitProjectForm();
      }
    });

    // 运维中心：数据中心管理
    $("#btn-dc-create")?.addEventListener("click", () => openDcForm(null));
    $("#modal-dc-confirm")?.addEventListener("click", submitDcForm);
    $("#modal-dc-cancel")?.addEventListener("click", closeDcForm);
    $("#modal-dc-close")?.addEventListener("click", closeDcForm);
    $("#modal-dc")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-dc")) closeDcForm();
    });
    $("#dc-form-id")?.addEventListener("input", updateDcLabelPreview);
    bindDcColorPicker();
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !isDcColorPaletteOpen()) return;
      closeDcColorPalette();
      e.preventDefault();
    });
    $("#modal-dc-action-confirm")?.addEventListener("click", confirmDcAction);
    $("#modal-dc-action-cancel")?.addEventListener("click", closeDcAction);
    $("#modal-dc-action-close")?.addEventListener("click", closeDcAction);
    $("#modal-dc-action")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-dc-action")) closeDcAction();
    });

    // 运维中心：集群管理
    $("#btn-cluster-create")?.addEventListener("click", () => openClusterForm(null));
    $("#modal-cluster-confirm")?.addEventListener("click", submitClusterForm);
    $("#modal-cluster-cancel")?.addEventListener("click", closeClusterForm);
    $("#modal-cluster-close")?.addEventListener("click", closeClusterForm);
    $("#modal-cluster")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cluster")) closeClusterForm();
    });
    ["#cls-form-display", "#cls-form-desc", "#cls-form-kubeconfig"].forEach((sel) => {
      $(sel)?.addEventListener("input", () => {
        const err = $("#cls-form-error");
        if (err) {
          err.style.display = "none";
          err.textContent = "";
        }
      });
    });
    $("#modal-cluster-detail-cancel")?.addEventListener("click", closeClusterDetail);
    $("#modal-cluster-detail-close")?.addEventListener("click", closeClusterDetail);
    $("#modal-cluster-detail")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cluster-detail")) closeClusterDetail();
    });
    $("#modal-cluster-action-confirm")?.addEventListener("click", confirmClusterDelete);
    $("#modal-cluster-action-cancel")?.addEventListener("click", closeClusterDeleteConfirm);
    $("#modal-cluster-action-close")?.addEventListener("click", closeClusterDeleteConfirm);
    $("#modal-cluster-action")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-cluster-action")) closeClusterDeleteConfirm();
    });
    $("#modal-cluster-detail-nodes")?.addEventListener("click", () => {
      const id = pendingClusterDetailId;
      closeClusterDetail();
      if (id) {
        navigate("node-mgmt", { clusterId: id });
        toast(`已切换至集群：${clusterName(id)}`);
      }
    });

    // 运维中心：节点管理
    $("#node-mgmt-search")?.addEventListener("input", (e) => {
      nodeMgmtFilter.q = e.target.value || "";
      nodeMgmtFilter.page = 1;
      renderNodeMgmtList();
    });
    $("#node-mgmt-filter-dc")?.addEventListener("change", (e) => {
      nodeMgmtFilter.dc = e.target.value || "all";
      nodeMgmtFilter.page = 1;
      renderNodeMgmtList();
    });
    $("#node-mgmt-filter-status")?.addEventListener("change", (e) => {
      nodeMgmtFilter.status = e.target.value || "all";
      nodeMgmtFilter.page = 1;
      renderNodeMgmtList();
    });
    $("#node-mgmt-filter-gpu")?.addEventListener("change", (e) => {
      nodeMgmtFilter.gpuType = e.target.value || "all";
      nodeMgmtFilter.page = 1;
      renderNodeMgmtList();
    });
    $("#btn-node-batch-dc")?.addEventListener("click", () => {
      openNodeDcForm([...nodeMgmtSelected]);
    });
    $("#btn-node-batch-labels")?.addEventListener("click", () => {
      openNodeLabelsEditor([...nodeMgmtSelected]);
    });
    $("#btn-node-batch-taints")?.addEventListener("click", () => {
      openNodeTaintsEditor([...nodeMgmtSelected]);
    });
    $("#btn-node-batch-iso")?.addEventListener("click", () => {
      openMaintAction("isolate", [...nodeMgmtSelected]);
    });
    $("#btn-node-batch-rec")?.addEventListener("click", () => {
      openMaintAction("recover", [...nodeMgmtSelected]);
    });
    $("#btn-node-batch-clear")?.addEventListener("click", () => {
      nodeMgmtSelected = new Set();
      renderNodeMgmtList();
    });
    $("#modal-node-dc-confirm")?.addEventListener("click", submitNodeDcForm);
    $("#modal-node-dc-cancel")?.addEventListener("click", closeNodeDcForm);
    $("#modal-node-dc-close")?.addEventListener("click", closeNodeDcForm);
    $("#modal-node-dc")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-node-dc")) closeNodeDcForm();
    });
    $("#modal-node-detail-cancel")?.addEventListener("click", closeNodeDetail);
    $("#modal-node-detail-close")?.addEventListener("click", closeNodeDetail);
    $("#modal-node-detail")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-node-detail")) closeNodeDetail();
    });
    $("#modal-node-detail-labels")?.addEventListener("click", () => {
      const name = pendingNodeDetailName;
      if (name) openNodeLabelsEditor(name);
    });
    $("#modal-node-detail-isolate")?.addEventListener("click", () => {
      const name = pendingNodeDetailName;
      if (name) {
        closeNodeDetail();
        openMaintAction("isolate", name);
      }
    });
    $("#modal-node-detail-recover")?.addEventListener("click", () => {
      const name = pendingNodeDetailName;
      if (name) {
        closeNodeDetail();
        openMaintAction("recover", name);
      }
    });
    $("#modal-node-labels-confirm")?.addEventListener("click", submitNodeLabels);
    $("#modal-node-labels-cancel")?.addEventListener("click", closeNodeLabelsEditor);
    $("#modal-node-labels-close")?.addEventListener("click", closeNodeLabelsEditor);
    $("#modal-node-labels")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-node-labels")) closeNodeLabelsEditor();
    });
    $("#btn-node-label-add")?.addEventListener("click", addNodeLabelRow);
    $("#node-label-key")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addNodeLabelRow();
      }
    });
    $("#node-label-value")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addNodeLabelRow();
      }
    });
    $("#node-label-key")?.addEventListener("input", () =>
      clearNodeFieldInvalid($("#node-label-key"), "#node-labels-error")
    );
    $("#node-label-value")?.addEventListener("input", () =>
      clearNodeFieldInvalid($("#node-label-value"), "#node-labels-error")
    );
    $("#node-label-key")?.addEventListener("blur", () => {
      const key = ($("#node-label-key")?.value || "").trim();
      if (!key) return;
      const msg = k8sQualifiedNameError(key, "标签 key");
      setInputInvalid($("#node-label-key"), !!msg);
      if (msg) setNodeEditorError($("#node-labels-error"), msg);
    });
    $("#node-label-value")?.addEventListener("blur", () => {
      const value = ($("#node-label-value")?.value || "").trim();
      if (!value) return;
      const msg = k8sLabelValueError(value, "标签 value");
      setInputInvalid($("#node-label-value"), !!msg);
      if (msg) setNodeEditorError($("#node-labels-error"), msg);
    });
    $("#modal-node-taints-confirm")?.addEventListener("click", submitNodeTaints);
    $("#modal-node-taints-cancel")?.addEventListener("click", closeNodeTaintsEditor);
    $("#modal-node-taints-close")?.addEventListener("click", closeNodeTaintsEditor);
    $("#modal-node-taints")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-node-taints")) closeNodeTaintsEditor();
    });
    $("#btn-node-taint-add")?.addEventListener("click", addNodeTaintRow);
    const bindTaintAddEnter = (sel) => {
      $(sel)?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addNodeTaintRow();
        }
      });
    };
    bindTaintAddEnter("#node-taint-key");
    bindTaintAddEnter("#node-taint-value");
    $("#node-taint-key")?.addEventListener("input", () =>
      clearNodeFieldInvalid($("#node-taint-key"), "#node-taints-error")
    );
    $("#node-taint-value")?.addEventListener("input", () =>
      clearNodeFieldInvalid($("#node-taint-value"), "#node-taints-error")
    );
    $("#node-taint-effect")?.addEventListener("change", () =>
      clearNodeFieldInvalid($("#node-taint-effect"), "#node-taints-error")
    );
    $("#node-taint-key")?.addEventListener("blur", () => {
      const key = ($("#node-taint-key")?.value || "").trim();
      if (!key) return;
      const msg = k8sQualifiedNameError(key, "污点 key");
      setInputInvalid($("#node-taint-key"), !!msg);
      if (msg) setNodeEditorError($("#node-taints-error"), msg);
    });
    $("#node-taint-value")?.addEventListener("blur", () => {
      const value = ($("#node-taint-value")?.value || "").trim();
      if (!value) return;
      const msg = k8sLabelValueError(value, "污点 value");
      setInputInvalid($("#node-taint-value"), !!msg);
      if (msg) setNodeEditorError($("#node-taints-error"), msg);
    });

    // 管理中心：队列
    $("#btn-queue-create")?.addEventListener("click", () => openQueueForm(null));
    $("#q-form-name")?.addEventListener("input", () => {
      const el = $("#q-form-name");
      if (!el || el.disabled) return;
      setQueueNameFieldError("");
    });
    $("#q-form-name")?.addEventListener("blur", () => {
      const el = $("#q-form-name");
      if (!el || el.disabled) return;
      const raw = (el.value || "").trim();
      if (!raw) {
        setQueueNameFieldError("");
        return;
      }
      setQueueNameFieldError(k8sDns1123SubdomainError(raw, "队列标识"));
    });
    $("#modal-queue-confirm")?.addEventListener("click", submitQueueForm);
    $("#modal-queue-cancel")?.addEventListener("click", closeQueueForm);
    $("#modal-queue-close")?.addEventListener("click", closeQueueForm);
    $("#modal-queue")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-queue")) closeQueueForm();
    });
    $("#modal-queue-action-confirm")?.addEventListener("click", confirmQueueAction);
    $("#modal-queue-action-cancel")?.addEventListener("click", closeQueueActionConfirm);
    $("#modal-queue-action-close")?.addEventListener("click", closeQueueActionConfirm);
    $("#modal-queue-action")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-queue-action")) closeQueueActionConfirm();
    });
    $("#q-form-dc")?.addEventListener("change", onQueueFormResourceFilterChange);
    $$("#q-form-features input[data-feature]").forEach((el) => {
      el.addEventListener("change", onQueueFormResourceFilterChange);
    });
    $("#q-form-gpu")?.addEventListener("change", updateQueueFormCapacityHint);
    // 关联团队：可多选
    $("#q-form-team-search")?.addEventListener("focus", () => {
      renderQueueTeamResults($("#q-form-team-search")?.value || "");
    });
    $("#q-form-team-search")?.addEventListener("click", () => {
      renderQueueTeamResults($("#q-form-team-search")?.value || "");
    });
    $("#q-form-team-search")?.addEventListener("input", (e) => {
      renderQueueTeamResults(e.target.value || "");
    });
    $("#q-form-team-search")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const first = $("#q-team-results [data-q-team-id]");
      first?.click();
    });
    document.addEventListener("click", (e) => {
      const picker = $("#q-team-picker");
      if (!picker) return;
      if (!(e.target instanceof Node) || !document.contains(e.target)) return;
      if (picker.contains(e.target)) return;
      $("#q-team-results")?.classList.add("hidden");
    });

    // 管理中心：用户管理 / 角色管理 / 系统配置
    $("#btn-user-add-ldap")?.addEventListener("click", openUserLdapModal);
    $("#btn-user-batch-role")?.addEventListener("click", () => {
      openUserRoleModal([...userMgmtSelected]);
    });
    $("#btn-user-batch-enable")?.addEventListener("click", () => {
      openUserActionConfirm("enable", [...userMgmtSelected]);
    });
    $("#btn-user-batch-disable")?.addEventListener("click", () => {
      openUserActionConfirm("disable", [...userMgmtSelected]);
    });
    $("#btn-user-batch-remove")?.addEventListener("click", () => {
      openUserActionConfirm("remove", [...userMgmtSelected]);
    });
    $("#btn-user-batch-clear")?.addEventListener("click", () => {
      userMgmtSelected = new Set();
      renderUserMgmt();
    });
    $("#link-system-ldap")?.addEventListener("click", () => navigate("system-config", { tab: "ldap" }));
    $("#modal-user-action-confirm")?.addEventListener("click", confirmUserAction);
    $("#modal-user-action-cancel")?.addEventListener("click", closeUserActionConfirm);
    $("#modal-user-action-close")?.addEventListener("click", closeUserActionConfirm);
    $("#modal-user-action")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-user-action")) closeUserActionConfirm();
    });
    $("#modal-user-ldap-confirm")?.addEventListener("click", confirmAddLdapUsers);
    $("#modal-user-ldap-cancel")?.addEventListener("click", closeUserLdapModal);
    $("#modal-user-ldap-close")?.addEventListener("click", closeUserLdapModal);
    $("#modal-user-ldap")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-user-ldap")) closeUserLdapModal();
    });
    $("#ldap-user-search")?.addEventListener("input", (e) => {
      renderLdapUserResults(e.target.value || "");
    });
    $("#ldap-user-role")?.addEventListener("change", updateLdapRoleHint);
    // 用户角色授权
    $("#modal-user-role-confirm")?.addEventListener("click", confirmUserRole);
    $("#modal-user-role-cancel")?.addEventListener("click", closeUserRoleModal);
    $("#modal-user-role-close")?.addEventListener("click", closeUserRoleModal);
    $("#modal-user-role")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-user-role")) closeUserRoleModal();
    });
    // 角色改名
    $("#modal-role-rename-confirm")?.addEventListener("click", confirmRoleRename);
    $("#modal-role-rename-cancel")?.addEventListener("click", closeRoleRenameModal);
    $("#modal-role-rename-close")?.addEventListener("click", closeRoleRenameModal);
    $("#modal-role-rename")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-role-rename")) closeRoleRenameModal();
    });
    $("#role-rename-name")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmRoleRename();
      }
    });

    // 管理中心：团队
    $("#btn-team-create")?.addEventListener("click", () => openTeamForm());
    $("#modal-team-confirm")?.addEventListener("click", submitTeamForm);
    $("#modal-team-cancel")?.addEventListener("click", closeTeamForm);
    $("#modal-team-close")?.addEventListener("click", closeTeamForm);
    $("#modal-team")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-team")) closeTeamForm();
    });
    // 负责人：从平台用户检索选择
    $("#team-form-owner-search")?.addEventListener("focus", () => {
      if (!$("#team-form-owner-search")?.readOnly) renderTeamOwnerResults($("#team-form-owner-search")?.value || "");
    });
    $("#team-form-owner-search")?.addEventListener("input", (e) => {
      if ($("#team-form-owner-search")?.readOnly) return;
      // 输入中清除已选
      if ($("#team-form-owner")?.value) {
        $("#team-form-owner").value = "";
        $("#team-owner-selected")?.classList.add("hidden");
        $("#team-owner-clear")?.classList.add("hidden");
      }
      renderTeamOwnerResults(e.target.value || "");
    });
    $("#team-owner-clear")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setTeamOwnerSelection(null);
      $("#team-form-owner-search")?.focus();
      renderTeamOwnerResults("");
    });
    document.addEventListener("click", (e) => {
      const picker = $("#team-owner-picker");
      if (!picker || picker.contains(e.target)) return;
      $("#team-owner-results")?.classList.add("hidden");
    });
    $("#modal-team-member-cancel")?.addEventListener("click", closeTeamMemberModal);
    $("#modal-team-member-close")?.addEventListener("click", closeTeamMemberModal);
    $("#modal-team-member")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-team-member")) closeTeamMemberModal();
    });
    $("#team-member-search")?.addEventListener("input", (e) => {
      renderTeamMemberResults(e.target.value || "");
    });
    $("#modal-team-queue-confirm")?.addEventListener("click", submitTeamQueueModal);
    $("#modal-team-queue-cancel")?.addEventListener("click", closeTeamQueueModal);
    $("#modal-team-queue-close")?.addEventListener("click", closeTeamQueueModal);
    $("#modal-team-queue")?.addEventListener("click", (e) => {
      if (e.target === $("#modal-team-queue")) closeTeamQueueModal();
    });

    // hash routing（v3 默认进集群概览）
    routeFromHash();

    updateAlertNavBadge();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.App = { navigate, toast, goCreateJob, goRerunJob, goExpDetail };
})();

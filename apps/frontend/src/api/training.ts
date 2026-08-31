import { api } from "./client";

export type TrainingCluster = { id: number; name: string; displayName: string; status: string };
export type TrainingTeam = { id: number; name: string };
export type RunUser = { id: number; username: string; nickname: string; email: string; department: string };

export type JobItem = {
  id: number;
  clusterId: number;
  name: string;
  status: string;
  priority: string;
  teamId: number;
  teamName: string;
  queueId: number;
  queueName: string;
  queueDisplayName: string;
  datacenterCode: string;
  gpuType: string;
  requireIb: boolean;
  nodes: number;
  gpusPerNode: number;
  gpuCount: number;
  cpuPerNode: number;
  memGiPerNode: number;
  ownerUsername: string;
  ownerNickname: string;
  submittedByUsername: string;
  submittedByNickname: string;
  durationMs: number;
  gpuHours: number;
  syncError: string;
  failReason: string;
  rerunFromId: number;
  createdAt: number;
  startedAt: number;
  endedAt: number;
};

export type EnvEntry = { key: string; value: string };
export type MountFile = { path: string; content: string; size: number };
export type MountSnapshot = {
  setId: number;
  setName: string;
  displayName: string;
  version: number;
  mountPath: string;
  digest: string;
  files: MountFile[];
};
export type JobDetail = JobItem & {
  namespace: string;
  image: string;
  command: string;
  workdir: string;
  env: EnvEntry[];
  mounts: MountSnapshot[];
};
export type JobPod = { name: string; task: string; index: number; node: string; phase: string; restarts: number; role: string };
export type JobAlert = { id: number; displayId: string; severity: string; title: string; status: string; nodeNames: string; createdAt: number };

export type JobWrite = {
  clusterId: number;
  name: string;
  workdir: string;
  priority: string;
  teamId: number;
  queueId: number;
  nodes: number;
  gpusPerNode: number;
  cpuPerNode: number;
  memGiPerNode: number;
  image: string;
  command: string;
  env: EnvEntry[];
  mounts: { setId: number; version: number; mountPath: string; files?: string[] }[];
  runUserId?: number;
  rerunFromId?: number;
};

export type MyQueueJob = {
  id: number;
  name: string;
  status: string;
  priority: string;
  gpuCount: number;
  gpuType: string;
  cpuTotal: number;
  memGiTotal: number;
  ownerNickname: string;
  gpuHours: number;
  durationMs: number;
};
export type MyQueue = {
  id: number;
  name: string;
  displayName: string;
  datacenterCode: string;
  gpuType: string;
  gpuQuota: number;
  gpuUsed: number;
  cpuQuota: number;
  cpuUsed: number;
  memQuotaGi: number;
  memUsedGi: number;
  features: string[];
  enabled: boolean;
  state: string;
  syncError: string;
  teams: TrainingTeam[];
  gpuHoursMonth: number;
  running: number;
  pending: number;
  activeJobs: MyQueueJob[];
};
export type MyQueueSummary = {
  gpuQuota: number;
  gpuUsed: number;
  cpuQuota: number;
  cpuUsed: number;
  memQuotaGi: number;
  memUsedGi: number;
  gpuHoursMonth: number;
  gpuHoursRunning: number;
  running: number;
  pending: number;
};

export type ConfigFile = { path: string; content: string };
export type ConfigItem = {
  id: number;
  name: string;
  displayName: string;
  teamId: number;
  teamName: string;
  framework: string;
  visibility: string;
  status: string;
  latestVersion: number;
  latestMessage?: string;
  fileCount: number;
  ownerUsername: string;
  ownerNickname: string;
  hasDraft: boolean;
  draftUpdatedAt: number;
  updatedAt: number;
  createdAt: number;
};
export type ConfigVersion = {
  version: number;
  message: string;
  authorUsername: string;
  authorNickname: string;
  digest: string;
  fileCount: number;
  createdAt: number;
};
export type ConfigDraft = {
  ownerUsername: string;
  ownerNickname: string;
  message: string;
  files: ConfigFile[];
  updatedAt: number;
};
export type ConfigDetail = ConfigItem & {
  description: string;
  files: ConfigFile[];
  draft: ConfigDraft | null;
  versions: ConfigVersion[];
};

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all") return;
    search.set(key, String(value));
  });
  return search.toString();
}

export function listTrainingClusters() {
  return api<{ list: TrainingCluster[] }>("/training/clusters");
}
export function listTrainingTeams() {
  return api<{ list: TrainingTeam[] }>("/training/teams");
}
export function listRunUsers(query: { keyword?: string; pageNum?: number; pageSize?: number }) {
  return api<{ list: RunUser[]; total: number }>(`/training/run-users?${qs({ keyword: query.keyword, pageNum: query.pageNum ?? 1, pageSize: query.pageSize ?? 20 })}`);
}
export function listMyQueues(clusterId: number) {
  return api<{ summary: MyQueueSummary; list: MyQueue[] }>(`/training/queues?${qs({ clusterId })}`);
}
export function listJobs(query: {
  clusterId: number;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  teamId?: number;
  queueId?: number;
  status?: string;
  priority?: string;
  node?: string;
}) {
  return api<{ list: JobItem[]; total: number }>(
    `/training/jobs?${qs({
      clusterId: query.clusterId,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword,
      teamId: query.teamId || undefined,
      queueId: query.queueId || undefined,
      status: query.status,
      priority: query.priority,
      node: query.node,
    })}`,
  );
}
export function createJob(input: JobWrite) {
  return api<{ id: number }>("/training/jobs", { method: "POST", body: JSON.stringify(input) });
}
export function getJob(id: number) {
  return api<JobDetail>(`/training/jobs/${id}`);
}
export function cancelJob(id: number) {
  return api<Record<string, never>>(`/training/jobs/${id}/status`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
}
export function listJobPods(id: number) {
  return api<{ list: JobPod[] }>(`/training/jobs/${id}/pods`);
}
export function getJobLogs(id: number, pod: string, tailLines = 500) {
  return api<{ content: string }>(`/training/jobs/${id}/pods/${encodeURIComponent(pod)}/logs?tailLines=${tailLines}`);
}
export function listJobAlerts(id: number) {
  return api<{ list: JobAlert[] }>(`/training/jobs/${id}/alerts`);
}
export function listConfigs(query: { pageNum: number; pageSize: number; keyword?: string; teamId?: number; scope?: string; status?: string; framework?: string }) {
  return api<{ list: ConfigItem[]; total: number }>(
    `/training/configs?${qs({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword,
      teamId: query.teamId || undefined,
      scope: query.scope,
      status: query.status,
      framework: query.framework,
    })}`,
  );
}
export function createConfig(input: { displayName: string; teamId: number; framework: string; visibility: string; description?: string; files?: ConfigFile[]; message?: string }) {
  return api<{ id: number }>("/training/configs", { method: "POST", body: JSON.stringify(input) });
}
export function getConfig(id: number) {
  return api<ConfigDetail>(`/training/configs/${id}`);
}
export function saveConfigDraft(id: number, input: { displayName: string; framework: string; visibility: string; description?: string; message?: string; files: ConfigFile[] }) {
  return api<Record<string, never>>(`/training/configs/${id}/draft`, { method: "PUT", body: JSON.stringify(input) });
}
export function publishConfig(id: number, input: { displayName: string; framework: string; visibility: string; description?: string; message: string; baseVersion: number; files: ConfigFile[] }) {
  return api<{ version: number }>(`/training/configs/${id}/versions`, { method: "POST", body: JSON.stringify(input) });
}
export function getConfigVersion(id: number, version: number) {
  return api<ConfigVersion & { files: ConfigFile[] }>(`/training/configs/${id}/versions/${version}`);
}
export function updateConfigStatus(id: number, status: string) {
  return api<Record<string, never>>(`/training/configs/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

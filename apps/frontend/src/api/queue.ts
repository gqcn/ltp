import { api } from "./client";

export type QueueTeam = { id: number; name: string };

export type Queue = {
  id: number;
  clusterId: number;
  name: string;
  displayName: string;
  description: string;
  datacenterCode: string;
  datacenterName?: string;
  datacenterShortName?: string;
  datacenterColor?: string;
  gpuType: string;
  gpuQuota: number;
  gpuUsed: number;
  cpuQuota: number;
  cpuUsed: number;
  memQuotaGi: number;
  memUsedGi: number;
  weight: number;
  reclaimable: boolean;
  features: string[];
  enabled: boolean;
  gpuHoursMonth: number;
  state: string;
  pending: number;
  running: number;
  syncError: string;
  teams: QueueTeam[];
  createdAt: number;
  updatedAt: number;
};

export type QueueWrite = {
  clusterId?: number;
  name?: string;
  displayName: string;
  datacenterCode: string;
  gpuType: string;
  gpuQuota: number;
  cpuQuota: number;
  memQuotaGi: number;
  teamIds: number[];
  features: string[];
  weight: number;
  reclaimable: boolean;
  description: string;
};

export type CapacityPreview = {
  gpuTypes: { type: string; total: number; allocated: number; hasIB: boolean }[];
  cpuTotal: number;
  cpuAllocated: number;
  memTotalGi: number;
  memAllocated: number;
};

export function listQueues(query: {
  clusterId: number;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  datacenterCode?: string;
  gpuType?: string;
  enabled?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("clusterId", String(query.clusterId));
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.datacenterCode) params.set("datacenterCode", query.datacenterCode);
  if (query.gpuType) params.set("gpuType", query.gpuType);
  if (query.enabled !== undefined) params.set("enabled", String(query.enabled));
  return api<{ list: Queue[]; total: number }>(`/queues?${params.toString()}`);
}

export function createQueue(input: QueueWrite & { clusterId: number; name: string }) {
  return api<{ id: number }>("/queues", { method: "POST", body: JSON.stringify(input) });
}

export function updateQueue(id: number, input: QueueWrite) {
  return api<Record<string, never>>(`/queues/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function syncQueue(id: number) {
  return api<Record<string, never>>(`/queues/${id}/sync`, { method: "POST" });
}

export function updateQueueStatus(id: number, enabled: boolean) {
  return api<Record<string, never>>(`/queues/${id}/status`, { method: "PUT", body: JSON.stringify({ enabled }) });
}

export function deleteQueue(id: number) {
  return api<Record<string, never>>(`/queues/${id}`, { method: "DELETE" });
}

export function previewQueueCapacity(query: { clusterId: number; datacenterCode: string; features?: string[]; excludeQueueId?: number }) {
  const params = new URLSearchParams();
  params.set("clusterId", String(query.clusterId));
  params.set("datacenterCode", query.datacenterCode);
  if (query.excludeQueueId) params.set("excludeQueueId", String(query.excludeQueueId));
  (query.features ?? []).forEach((f) => params.append("features[]", f));
  return api<CapacityPreview>(`/queues/capacity-preview?${params.toString()}`);
}

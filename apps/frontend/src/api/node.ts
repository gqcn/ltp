import { api } from "./client";

export type NodeTaint = {
  key: string;
  value: string;
  effect: string;
};

export type ClusterNode = {
  name: string;
  ip: string;
  roles: string[];
  ready: boolean;
  schedulable: boolean;
  status: string;
  datacenter: string;
  datacenterName?: string;
  datacenterShortName?: string;
  datacenterColor?: string;
  gpuType: string;
  hasIB: boolean;
  ibDomain: string;
  isolated: boolean;
  isolateRemark: string;
  podCount: number;
  podCapacity: number;
  gpuUsed: number;
  gpuTotal: number;
  cpuUsedMilli: number;
  cpuTotalMilli: number;
  memUsedBytes: number;
  memTotalBytes: number;
  conditions: string[];
  labels: Record<string, string>;
  taints: NodeTaint[];
};

export type NodeList = {
  list: ClusterNode[];
  total: number;
  summary: { total: number; ready: number; notReady: number; unschedulable: number; unsetDc: number };
  gpuTypes: string[];
};

export type NodeEvent = {
  id: number;
  clusterId: number;
  nodeName: string;
  action: string;
  operator: string;
  remark: string;
  result: string;
  createdAt: number;
};

export function listNodes(query: {
  clusterId: number;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  datacenter?: string;
  status?: string;
  gpuType?: string;
}) {
  const params = new URLSearchParams();
  params.set("clusterId", String(query.clusterId));
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.datacenter) params.set("datacenter", query.datacenter);
  if (query.status) params.set("status", query.status);
  if (query.gpuType) params.set("gpuType", query.gpuType);
  return api<NodeList>(`/nodes?${params.toString()}`);
}

export function listNodeEvents(query: { clusterId: number; pageNum: number; pageSize: number; nodeName?: string }) {
  const params = new URLSearchParams();
  params.set("clusterId", String(query.clusterId));
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.nodeName) params.set("nodeName", query.nodeName);
  return api<{ list: NodeEvent[]; total: number }>(`/node-events?${params.toString()}`);
}

export function assignNodeDatacenter(input: { clusterId: number; names: string[]; code: string; remark?: string }) {
  return api<Record<string, never>>("/nodes/datacenter", { method: "PUT", body: JSON.stringify(input) });
}

export function updateNodeLabels(input: { clusterId: number; names: string[]; labels: Record<string, string>; remark?: string }) {
  return api<Record<string, never>>("/nodes/labels", { method: "PUT", body: JSON.stringify(input) });
}

export function updateNodeTaints(input: { clusterId: number; names: string[]; taints: NodeTaint[]; remark?: string }) {
  return api<Record<string, never>>("/nodes/taints", { method: "PUT", body: JSON.stringify(input) });
}

export type NodeQuotaImpactGPU = {
  type: string;
  current: number;
  after: number;
  allocated: number;
};

export type NodeQuotaImpactDC = {
  datacenterCode: string;
  cpuCurrent: number;
  cpuAfter: number;
  cpuAllocated: number;
  memCurrentGi: number;
  memAfterGi: number;
  memAllocated: number;
  gpuTypes: NodeQuotaImpactGPU[];
};

export type NodeQuotaImpact = {
  changed: boolean;
  overAllocated: boolean;
  datacenters: NodeQuotaImpactDC[];
};

export function previewNodeQuotaImpact(query: { clusterId: number; names: string[] }) {
  const params = new URLSearchParams();
  params.set("clusterId", String(query.clusterId));
  query.names.forEach((name) => params.append("names[]", name));
  return api<NodeQuotaImpact>(`/nodes/quota-impact?${params.toString()}`);
}

export function isolateNodes(input: { clusterId: number; names: string[]; remark?: string }) {
  return api<Record<string, never>>("/nodes/isolate", { method: "POST", body: JSON.stringify(input) });
}

export function recoverNodes(input: { clusterId: number; names: string[]; remark?: string }) {
  return api<Record<string, never>>("/nodes/recover", { method: "POST", body: JSON.stringify(input) });
}

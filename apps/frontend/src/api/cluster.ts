import { api } from "./client";

export type ResourceUsage = {
  used: number;
  total: number;
  unit: string;
};

export type GPUTypeUsage = {
  type: string;
  used: number;
  total: number;
};

export type ClusterDatacenter = {
  code: string;
  name: string;
  shortName: string;
  color: string;
};

export type Cluster = {
  id: number;
  name: string;
  displayName: string;
  description: string;
  apiServer: string;
  version: string;
  status: string;
  datacenters: ClusterDatacenter[];
  nodesReady: number;
  nodesTotal: number;
  gpu: ResourceUsage;
  cpu: ResourceUsage;
  memory: ResourceUsage;
  gpuByType: GPUTypeUsage[];
  kubeconfigSet: boolean;
  lastSyncAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ClusterSummary = {
  total: number;
  healthy: number;
  readyNodes: number;
  totalNodes: number;
  gpuTotal: number;
};

export type ClusterList = {
  list: Cluster[];
  total: number;
  summary: ClusterSummary;
};

export function listClusters(query: { pageNum: number; pageSize: number; keyword?: string }) {
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) {
    params.set("keyword", query.keyword);
  }
  return api<ClusterList>(`/clusters?${params.toString()}`);
}

export function getCluster(id: number) {
  return api<Cluster>(`/clusters/${id}`);
}

export function createCluster(input: { displayName: string; description: string; kubeconfig: string }) {
  return api<{ id: number }>("/clusters", { method: "POST", body: JSON.stringify(input) });
}

export function updateCluster(id: number, input: { displayName: string; description: string; kubeconfig?: string }) {
  return api<Record<string, never>>(`/clusters/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteCluster(id: number) {
  return api<Record<string, never>>(`/clusters/${id}`, { method: "DELETE" });
}

export function probeCluster(id: number) {
  return api<{ status: string; version: string; apiServer: string; lastSyncAt: number }>(`/clusters/${id}/probe`, {
    method: "POST",
  });
}

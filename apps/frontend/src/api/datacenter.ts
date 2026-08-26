import { api } from "./client";

export type DatacenterUsage = {
  nodes: number;
  queues: number;
  clusters: number;
};

export type Datacenter = {
  id: number;
  code: string;
  name: string;
  shortName: string;
  region: string;
  labelKey: string;
  label: string;
  color: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
  usage: DatacenterUsage;
  createdAt: number;
  updatedAt: number;
};

export type DatacenterSummary = {
  total: number;
  enabled: number;
  disabled: number;
  defaultShortName: string;
};

export type DatacenterList = {
  list: Datacenter[];
  total: number;
  summary: DatacenterSummary;
};

export type DatacenterListQuery = {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  enabled?: boolean;
};

export type DatacenterWriteInput = {
  code?: string;
  name: string;
  shortName: string;
  region: string;
  color: string;
  description: string;
};

export function listDatacenters(query: DatacenterListQuery) {
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) {
    params.set("keyword", query.keyword);
  }
  if (query.enabled !== undefined) {
    params.set("enabled", String(query.enabled));
  }
  return api<DatacenterList>(`/datacenters?${params.toString()}`);
}

export function createDatacenter(input: DatacenterWriteInput) {
  return api<{ id: number }>("/datacenters", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDatacenter(id: number, input: DatacenterWriteInput) {
  return api<Record<string, never>>(`/datacenters/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateDatacenterStatus(id: number, enabled: boolean) {
  return api<Record<string, never>>(`/datacenters/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

export function deleteDatacenter(id: number) {
  return api<Record<string, never>>(`/datacenters/${id}`, { method: "DELETE" });
}

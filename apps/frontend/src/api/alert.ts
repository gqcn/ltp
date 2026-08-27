import { api } from "./client";

export type AlertItem = {
  id: number;
  displayId: string;
  clusterId: number;
  severity: string;
  title: string;
  alertInfo: string;
  faultInfo: string;
  source: string;
  nodeNames: string;
  status: string;
  handleRemark: string;
  handledAt: number;
  handledBy: string;
  firstAlarmAt: number;
  createdAt: number;
};

export type AlertDetail = AlertItem & {
  alarmCount: number;
  alarmLevel: number;
  createUser: string;
  webhookPayload: string;
};

export type AlertSummary = {
  total: number;
  open: number;
  following: number;
  handled: number;
  critical: number;
  warning: number;
  info: number;
  unfinished: number;
};

export function listAlerts(query: {
  clusterId?: number;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  severity?: string;
  status?: string;
  range?: string;
}) {
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.clusterId) params.set("clusterId", String(query.clusterId));
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.severity) params.set("severity", query.severity);
  if (query.status) params.set("status", query.status);
  if (query.range) params.set("range", query.range);
  return api<{ list: AlertItem[]; total: number; summary: AlertSummary }>(`/alerts?${params.toString()}`);
}

export function getAlert(id: number) {
  return api<AlertDetail>(`/alerts/${id}`);
}

export function getAlertSummary() {
  return api<{ unfinished: number; open: number; following: number }>("/alerts/summary");
}

export function updateAlertStatus(id: number, status: string, remark: string) {
  return api<Record<string, never>>(`/alerts/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, remark }),
  });
}

export function batchUpdateAlertStatus(ids: number[], status: string, remark: string) {
  return api<Record<string, never>>("/alerts/status", {
    method: "PUT",
    body: JSON.stringify({ ids, status, remark }),
  });
}

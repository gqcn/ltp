import { api } from "./client";

export type TeamOwner = {
  id: number;
  username: string;
  nickname: string;
};

export type TeamMember = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  department: string;
};

export type TeamListItem = {
  id: number;
  name: string;
  description: string;
  owner: TeamOwner;
  memberCount: number;
  createdAt: number;
};

export type TeamDetail = TeamListItem & {
  members: TeamMember[];
  updatedAt: number;
};

export type TeamListQuery = {
  pageNum: number;
  pageSize: number;
  keyword?: string;
};

export function listTeams(query: TeamListQuery) {
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) {
    params.set("keyword", query.keyword);
  }
  return api<{ list: TeamListItem[]; total: number }>(`/teams?${params.toString()}`);
}

export function getTeam(id: number) {
  return api<TeamDetail>(`/teams/${id}`);
}

export function createTeam(input: { name: string; description: string; ownerUserId: number }) {
  return api<{ id: number }>("/teams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTeam(id: number, input: { name: string; description: string; ownerUserId: number }) {
  return api<Record<string, never>>(`/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function addTeamMember(teamId: number, userId: number) {
  return api<Record<string, never>>(`/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeTeamMember(teamId: number, userId: number) {
  return api<Record<string, never>>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

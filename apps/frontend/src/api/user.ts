import { api } from "./client";

export type TeamRef = {
  id: number;
  name: string;
};

export type PlatformUser = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  department: string;
  title: string;
  roleCode: string;
  roleName: string;
  teams: TeamRef[];
  enabled: boolean;
  lastLoginAt: number;
  createdAt: number;
};

export type UserList = {
  list: PlatformUser[];
  total: number;
};

export type UserListQuery = {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  roleCode?: string;
  enabled?: boolean;
};

export type DirectoryUser = {
  username: string;
  name: string;
  email: string;
  department: string;
  title: string;
  alreadyAdded: boolean;
};

export function listUsers(query: UserListQuery) {
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) {
    params.set("keyword", query.keyword);
  }
  if (query.roleCode) {
    params.set("roleCode", query.roleCode);
  }
  if (query.enabled !== undefined) {
    params.set("enabled", String(query.enabled));
  }
  return api<UserList>(`/users?${params.toString()}`);
}

export function addUsersFromLdap(usernames: string[], roleCode: string) {
  return api<{ added: number }>("/users", {
    method: "POST",
    body: JSON.stringify({ usernames, roleCode }),
  });
}

export function updateUserStatus(ids: number[], enabled: boolean) {
  return api<{ updated: number }>("/users/status", {
    method: "PUT",
    body: JSON.stringify({ ids, enabled }),
  });
}

export function updateUserRole(ids: number[], roleCode: string) {
  return api<{ updated: number }>("/users/role", {
    method: "PUT",
    body: JSON.stringify({ ids, roleCode }),
  });
}

export function removeUsers(ids: number[]) {
  return api<{ removed: number }>("/users", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export function searchLdapDirectory(keyword: string) {
  const params = new URLSearchParams();
  if (keyword) {
    params.set("keyword", keyword);
  }
  const query = params.toString();
  return api<{ list: DirectoryUser[] }>(`/system/ldap/directory${query ? `?${query}` : ""}`);
}

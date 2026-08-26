import { api } from "./client";

export type Role = {
  id: number;
  code: string;
  name: string;
  description: string;
  menus: string[];
  builtin: boolean;
  userCount: number;
  updatedBy: string;
  updatedAt: number;
};

export function listRoles() {
  return api<{ list: Role[] }>("/roles");
}

export function renameRole(id: number, name: string) {
  return api<Record<string, never>>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

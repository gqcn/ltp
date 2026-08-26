import { api } from "./client";

export type SessionUser = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  department: string;
  title: string;
  source: "local" | "ldap";
  roleCode: string;
  roleName: string;
  menus: string[];
  isAdmin: boolean;
};

export type SessionPayload = {
  user: SessionUser;
};

export type LoginMode = "ldap" | "admin";

export function login(mode: LoginMode, username: string, password: string) {
  return api<SessionPayload>("/auth/sessions", {
    method: "POST",
    body: JSON.stringify({ mode, username, password }),
  });
}

export function readSession() {
  return api<SessionPayload>("/auth/session");
}

export function logout() {
  return api<{ loggedOut: boolean }>("/auth/session", { method: "DELETE" });
}

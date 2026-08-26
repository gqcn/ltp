import { api } from "./client";

export type SessionUser = {
  id: number;
  username: string;
  nickname: string;
};

export type SessionPayload = {
  user: SessionUser;
};

export function login(username: string, password: string) {
  return api<SessionPayload>("/auth/sessions", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function readSession() {
  return api<SessionPayload>("/auth/session");
}

export function logout() {
  return api<{ loggedOut: boolean }>("/auth/session", { method: "DELETE" });
}

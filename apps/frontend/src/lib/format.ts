export function formatTime(ms: number) {
  if (!ms) {
    return "—";
  }
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function initials(name: string) {
  const text = name.trim();
  return text ? text.slice(0, 1) : "管";
}

export function adminShellMeta(user: { username: string; nickname: string }) {
  const displayName = user.nickname || user.username;
  const isAdmin = user.username === "admin" || user.nickname === "平台管理员";
  return {
    displayName,
    roleName: isAdmin ? "平台管理员" : displayName,
    avatar: isAdmin ? "管" : initials(displayName),
    menuSub: isAdmin ? `${user.username} · 平台管理员` : user.username,
  };
}

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

export function adminShellMeta(user: { username: string; nickname: string; isAdmin?: boolean; roleName?: string }) {
  const displayName = user.nickname || user.username;
  const isAdmin = Boolean(user.isAdmin);
  const roleName = user.roleName || (isAdmin ? "平台管理员" : displayName);
  return {
    displayName,
    roleName,
    avatar: isAdmin ? "管" : initials(displayName),
    menuSub: `${user.username} · ${roleName}`,
  };
}

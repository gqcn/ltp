export function formatDuration(ms: number) {
  if (!ms || ms < 0) {
    return "—";
  }
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

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

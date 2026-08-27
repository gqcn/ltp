const STORAGE_KEY = "ltp.workingClusterId";

export function readWorkingClusterId(): number | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function writeWorkingClusterId(id: number) {
  window.localStorage.setItem(STORAGE_KEY, String(id));
}

export function pickWorkingClusterId(ids: number[], current: number | null) {
  if (current && ids.includes(current)) {
    return current;
  }
  return ids[0] ?? null;
}

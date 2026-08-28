export function milliToCores(milli: number) {
  const cores = milli / 1000;
  if (!Number.isFinite(cores) || cores === 0) {
    return 0;
  }
  if (Number.isInteger(cores)) {
    return cores;
  }
  return Math.round(cores * 10) / 10;
}

export function formatMilliCPU(milli: number) {
  return String(milliToCores(milli));
}

export function bytesToGi(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

export function formatBytes(bytes: number) {
  if (!bytes) {
    return "0";
  }
  const gi = bytesToGi(bytes);
  if (gi >= 1024) {
    return `${(gi / 1024).toFixed(1)} TiB`;
  }
  if (gi >= 10) {
    return `${Math.round(gi)} GiB`;
  }
  return `${gi.toFixed(1)} GiB`;
}

export function usageText(used: number, total: number, format: (n: number) => string = String) {
  return `${format(used)} / ${format(total)}`;
}

export function usagePct(used: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((used / total) * 100));
}

export function quotaBarClass(pct: number) {
  if (pct >= 90) {
    return "is-danger";
  }
  if (pct >= 70) {
    return "is-warn";
  }
  return "is-ok";
}

export function statusDot(status: string) {
  if (status === "healthy" || status === "Ready" || status === "Open") {
    return "is-ok";
  }
  if (status === "offline" || status === "NotReady" || status === "Closed") {
    return "is-danger";
  }
  return "is-warn";
}

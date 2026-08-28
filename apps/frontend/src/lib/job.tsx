import type { ReactNode } from "react";
import { formatTime } from "@/lib/format";

const statusLabel: Record<string, string> = {
  running: "运行中",
  starting: "启动中",
  queued: "排队中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const statusClass: Record<string, string> = {
  running: "badge-running",
  starting: "badge-starting",
  queued: "badge-queued",
  success: "badge-success",
  failed: "badge-failed",
  cancelled: "badge-cancelled",
};

const priorityLabel: Record<string, string> = { P0: "最高", P1: "高", P2: "中", P3: "低" };

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusClass[status] || ""}`}>{statusLabel[status] || status}</span>;
}

export function JobPriorityBadge({ priority }: { priority: string }) {
  const code = priority || "P2";
  const label = priorityLabel[code] || "";
  return (
    <span className={`priority-badge priority-${code.toLowerCase()}`} title={`优先级 ${code} · ${label}`}>
      {code}
      {label ? <span className="priority-badge-label">{label}</span> : null}
    </span>
  );
}

export function formatGpuHours(hours: number, opts?: { unit?: boolean }) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0) {
    return "—";
  }
  let text: string;
  if (value === 0) {
    text = "0";
  } else if (value < 10) {
    text = value.toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  } else if (value < 100) {
    text = value.toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
  } else {
    text = Math.round(value).toLocaleString("zh-CN");
  }
  return opts?.unit ? `${text} 卡时` : text;
}

export function formatMemGi(n: number) {
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  if (n >= 1024) {
    const ti = n / 1024;
    const text = ti % 1 === 0 ? String(ti) : ti.toFixed(1).replace(/\.0$/, "");
    return `${text} TiB`;
  }
  return `${Math.round(n)} GiB`;
}

export function formatMemPair(used: number, total: number) {
  const toTi = (n: number) => {
    const ti = n / 1024;
    return ti % 1 === 0 ? String(ti) : ti.toFixed(1);
  };
  if (total >= 1024 || used >= 1024) {
    return `${toTi(used)}/${toTi(total)}Ti`;
  }
  return `${used}/${total}Gi`;
}

export function frameworkLabel(fw: string) {
  if (fw === "megatron") return "Megatron";
  if (fw === "nemo") return "NeMo";
  if (fw === "accelerate") return "Accelerate";
  if (fw === "custom") return "自定义";
  return fw || "—";
}

export function JobResourceCell({
  gpuCount,
  gpuType,
  nodes,
  cpuTotal,
  memGiTotal,
  ib,
}: {
  gpuCount: number;
  gpuType: string;
  nodes: number;
  cpuTotal: number;
  memGiTotal: number;
  ib?: boolean;
}) {
  return (
    <div className="job-res">
      <div className="job-res-gpu" title={`${gpuCount} × ${gpuType}`}>
        <span className="job-res-gpu-count">{gpuCount}</span>
        <span className="job-res-gpu-mul" aria-hidden="true">
          ×
        </span>
        <span className="job-res-gpu-type">{gpuType || "—"}</span>
      </div>
      <div className="job-res-specs">
        <span className="job-res-spec">
          <em>节点</em>
          <b>{nodes || "—"}</b>
        </span>
        <span className="job-res-spec">
          <em>CPU</em>
          <b>{cpuTotal}</b>
        </span>
        <span className="job-res-spec">
          <em>内存</em>
          <b>{formatMemGi(memGiTotal)}</b>
        </span>
        {ib ? (
          <span className="tag tag-ib" title="使用 InfiniBand 高速网络">
            IB
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function isActiveJob(status: string) {
  return status === "running" || status === "starting" || status === "queued";
}

export function emptyNode(children: ReactNode) {
  return <div className="empty-state">{children}</div>;
}

export function CreatedAtCell({ ms }: { ms: number }) {
  const text = formatTime(ms);
  if (text === "—") {
    return <>{text}</>;
  }
  const [day, ...rest] = text.split(" ");
  return (
    <>
      <div>{day}</div>
      <div className="td-created-time">{rest.join(" ")}</div>
    </>
  );
}

export function configFileLang(path: string) {
  if (/\.json$/i.test(path)) return "JSON";
  if (/\.ya?ml$/i.test(path)) return "YAML";
  if (/\.(sh|bash)$/i.test(path)) return "SHELL";
  return "TEXT";
}

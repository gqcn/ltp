import { quotaBarClass, usagePct } from "@/lib/resources";

type UsageProps = {
  used: number | null;
  total: number;
  unit?: string;
  label?: string;
  unknown?: boolean;
};

export function UsageCell({ used, total, unit, label = "用量", unknown }: UsageProps) {
  if (unknown || used == null || !total) {
    return (
      <div className="node-usage-cell is-unknown" title={`${label} 未知`}>
        <span className="node-usage-pct text-muted">—</span>
        <div className="progress node-usage-bar">
          <div className="progress-bar" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }
  const pct = usagePct(used, total);
  const unitHint = unit ? ` ${unit}` : "";
  return (
    <div className="node-usage-cell" title={`${label} ${formatAmount(used)}/${formatAmount(total)}${unitHint}（${pct}%）`}>
      <span className="node-usage-pct node-usage-frac">
        <span className="node-pods-used">{formatAmount(used)}</span>
        <span className="node-pods-sep">/</span>
        <span className="node-pods-cap">{formatAmount(total)}</span>
        {unit ? <span className="node-usage-unit">{unit}</span> : null}
      </span>
      <div className="progress node-usage-bar">
        <div className={`progress-bar ${quotaBarClass(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type QuotaProps = {
  label: string;
  used: number;
  total: number;
  unit?: string;
};

export function QuotaMini({ label, used, total, unit }: QuotaProps) {
  const free = Math.max(0, total - used);
  const pct = usagePct(used, total);
  const unitHint = unit ? ` ${unit}` : "";
  return (
    <div className="queue-quota-mini">
      <div className="queue-quota-mini-label">
        <span>{label}</span>
        <span className="mono">
          {formatAmount(used)}/{formatAmount(total)}
          {unitHint} · 余 <strong className={free ? "text-success" : "text-danger"}>{formatAmount(free)}</strong>
        </span>
      </div>
      <div className="progress queue-quota-mini-bar">
        <div className={`progress-bar ${quotaBarClass(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DcBadge({ code, name, shortName, color }: { code: string; name?: string; shortName?: string; color?: string }) {
  if (!code) {
    return <span className="text-muted">未分配</span>;
  }
  const label = shortName || name || code;
  return (
    <span className="dc-badge" title={name ? `${name}（${code}）` : code} style={{ ["--dc-color" as string]: color || "#64748b" }}>
      {label}
    </span>
  );
}

function formatAmount(n: number) {
  if (!Number.isFinite(n)) {
    return "0";
  }
  if (Number.isInteger(n)) {
    return String(n);
  }
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
